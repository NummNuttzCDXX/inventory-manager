// Category Control funcs
const Categories = require('../models/Categories');
const Instruments = require('../models/Instruments');
const asyncHandler = require('express-async-handler');
const {body, validationResult} = require('express-validator');

exports.categoryList = asyncHandler(async (req, res, next) => {
	// Get all categories
	const cats = await Categories.find({
		subCategories: {$ne: null},
	}).exec();

	// Get how many items are in each category
	const countProms = [];
	cats.forEach((cat) => {
		// Iterate categories and count instruments in each
		// WITHOUT `AWAIT` to get the Promise
		const prom = Instruments.countDocuments({category: cat._id}).exec();
		countProms.push(prom);
	});

	// After each count is queried, then await all the promises,
	// Otherwise well have to wait for each count individually
	const counts = await Promise.all(countProms);

	res.render('category_list', {
		title: 'Categories', categories: cats, counts,
	});
});

exports.categoryDetail = asyncHandler(async (req, res, next) => {
	const cat = await Categories.findById(req.params.id)
		.populate('subCategories');

	// Check if `cat` is a sub-category
	let query = {};
	if (cat.subCategories) query = {category: req.params.id};
	else query = {subCategory: req.params.id};

	const total = await Instruments.countDocuments(query).exec();

	res.render('category_detail', {
		title: cat.name,
		category: cat,
		total,
	});
});

// Render Create new Category form
exports.createCategory = asyncHandler(async (req, res, next) => {
	// Get Sub-Categories
	const subCats = await Categories.find({subCategories: null})
		.sort('name').exec();

	res.render('category_form', {
		title: 'Create Category/Sub-Category',
		subCats,
	});
});

// POST - Validate and Create new Category
exports.createCategory_POST = [
	// Validate/Sanitize Name
	body('catName', 'Name must not be empty')
		.trim()
		.isLength({min: 3})
		.escape(),
	// Validate/Sanitize Desc
	body('catDesc', 'Description must contain at least 5 characters')
		.trim()
		.isLength({min: 5})
		.escape(),

	// Create Category
	asyncHandler(async (req, res, next) => {
		// Extract Errors from request
		const errs = validationResult(req);

		// Get sub-categories, if any
		let subCats = [];
		const subCategories = await Categories.find({subCategories: null}, 'name')
			.sort('name').exec();
		if (req.body.catType === 'category') { // If NOT sub-category
			// Iterate subCategories in DB
			for (const item of subCategories) {
				// If corrosponding checkbox is checked, push ID to arr
				if (req.body[item.name] === 'on') subCats.push(item._id);
			}
		} else subCats = null;

		// Create a category with sanitized data
		const cat = new Categories({
			name: req.body.catName,
			description: req.body.catDesc,
			subCategories: subCats,
		});


		// If there are errors, render form again with sanitized values
		if (!errs.isEmpty()) {
			res.render('category_form', {
				title: 'Create Category/Sub-Category',
				subCats: subCategories,
				category: cat,
				errors: errs,
			});
		} else {
			// No errors, save category & redirect to detail page
			await cat.save();

			// If a new Sub-Category is created
			if (cat.subCategories == null) {
				const allCategories = await Categories.find({
					subCategories: {$ne: null},
				}, 'name')
					.sort('name').exec();

				// Render new form to select a parent category for the new
				// sub-category to belong to
				res.render('subcategory_form', {
					title: 'Select Parent Category',
					category: cat,
					categoryList: allCategories,
				});
			} else {
				res.redirect(cat.url);
			}
		}
	}),
];

// POST - Create new sub-category
// Add newly created SubCat to the Parent Category's `subCategories` array
exports.createSubCategory_POST = asyncHandler(async (req, res, next) => {
	// Get the newly created sub-category
	const subCat = await Categories.findById(req.body.newCat).exec();

	// For each checked box
	for (const box in req.body) {
		if (box == 'newCat') continue; // Skip the hidden input

		// Get the corrosponding category
		const category = await Categories.findOne({name: box}).exec();
		const oldSubCats = category.subCategories;

		// Push the new sub-category's ID to array
		oldSubCats.push(subCat._id);

		// Update the category
		await Categories.findByIdAndUpdate(category._id, {
			name: category.name,
			description: category.description,
			subCategories: oldSubCats,
		}, {});
	}

	// Go to newly created sub-category's page
	res.redirect(subCat.url);
});

// Render Delete Category Form
exports.deleteCategory = asyncHandler(async (req, res, next) => {
	const category = await Categories.findById(req.params.id, 'name').exec();

	res.render('category_delete', {
		title: 'Delete Category',
		delCat: category,
		action: 'confirmation',
	});
});

// POST - Delete Category
exports.deleteCategory_POST = [
	// Check if Deleted Category has subCats that are not connected to
	// another parent category
	asyncHandler(async (req, res, next) => {
		const category = await Categories.findById(req.params.id).exec();

		// If `category` IS a subCat OR HAS no subCats - move to next middleware
		if (category.subCategories == null) return next();
		else if (category.subCategories.length == 0) return next();
		else if (req.params.action == 'confirmed') return next();


		// `category` has subCats

		/* Iterate and query each subCategory (without `await`) and
		save each Promise to array.
		Then, `await` all Promises at once through `Promise.all` */
		const subCatPromises = [];
		if (category.subCategories) {
			category.subCategories.forEach((subId) => {
				subCatPromises.push(
					Categories.findById(subId).exec(),
				);
			});
		}

		const subCats = await Promise.all(subCatPromises);

		const categoriesToDelete = [category];
		// Check if subCats have a parent category
		for (const subCat of subCats) {
			// Count how many categories has this Sub-Category
			const count =
				await Categories.countDocuments({subCategories: subCat._id});

			// subCat has another parent category - SKIP
			if (count > 1) continue;

			// subCat has no parent category - Push to delete
			categoriesToDelete.push(subCat);
		}

		/* If there is more than 1 category to delete (category has sub-categories
		that do not have another parent category),
		Then render a confirmation page confirming the deletion of all said
		categories and sub-categories */
		if (categoriesToDelete.length > 1) {
			return res.render('category_delete', {
				title: 'Delete Categories',
				delCat: categoriesToDelete,
				action: 'confirmed',
			});
		}

		next();
	}),
	// Delete categories
	asyncHandler(async (req, res, next) => {
		// eslint-disable-next-line guard-for-in
		for (const cat in req.body) {
			// Iterate through request body to get IDs
			// For each ID, delete category
			const catToDelete = await Categories.findById(req.body[cat]).exec();

			// If is a sub-category
			if (catToDelete.subCategories === null) {
				const parentCat =
					await Categories.findOne({subCategories: catToDelete._id});

				if (parentCat) { // If parent is found
					// Remove `catToDelete` ._id from parent subCategories array
					const updatedSubCats =
						parentCat.subCategories.filter((id) => id !== catToDelete._id);

					// Update parent category's `subCategories` array
					await parentCat.updateOne({$set: {subCategories: updatedSubCats}})
						.exec();
				}
			}

			await catToDelete.deleteOne();
		}

		// Render Category List page
		res.redirect('/categories');
	}),
];
