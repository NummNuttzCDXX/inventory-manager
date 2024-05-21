// Category Control funcs
const Categories = require('../models/Categories');
const Instruments = require('../models/Instruments');
const asyncHandler = require('express-async-handler');
const {body, validationResult} = require('express-validator');
const mongoose = require('mongoose');

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
		if (req.body.newCat) return next();

		// Extract Errors from request
		const errs = validationResult(req);

		// Create a category with sanitized data
		const subCats = req.body.catType == 'category' ? [] : null;
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
				errors: errs.array(),
			});
		} else {
			// No errors, save category
			await cat.save();

			// If a new Sub-Category is created
			if (cat.subCategories == null) {
				const allCategories = await Categories.find({
					subCategories: {$ne: null},
				})
					.sort('name').exec();

				// Render new form to select a parent category for the new
				// sub-category to belong to
				return res.render('subcategory_form', {
					title: 'Select Parent Category',
					category: cat,
					categoryList: allCategories,
				});
			} else {
				const subCategories = await Categories.find({subCategories: null})
					.sort('name').exec();

				// Render new form to select sub-categories for the new parent
				// category to belong to
				return res.render('subcategory_form', {
					title: 'Select Sub-Categories',
					category: cat,
					categoryList: subCategories,
				});
			}
		}
	}),
	// Add parent/sub categories
	asyncHandler(async (req, res, next) => {
		const newCat = await Categories.findById(req.body.newCat).exec();

		// Main Category
		if (newCat.subCategories !== null) {
			const subCats = [];
			for (const box in req.body) {
				if (box == 'newCat' || box == 'catName' || box == 'catDesc') continue;

				subCats.push(box);
			}

			await newCat.updateOne({subCategories: subCats}).exec();

		// Sub-Category
		} else {
			const proms = [];
			for (const box in req.body) {
				if (box == 'newCat' || box == 'catName' || box == 'catDesc') continue;

				// Get parent
				const newParent = await Categories.findById(box).exec();

				const subs = newParent.subCategories;
				subs.push(newCat._id); // Push newCat._id

				// Update parent - NO AWAIT
				proms.push(newParent.updateOne({subCategories: subs}).exec());
			}

			await Promise.all(proms); // Await all updates at once
		}

		res.redirect(newCat.url);
	}),
];

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
			if (!subCat) continue; // Not found

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

// GET - Render Update Category Form
exports.updateCategory = asyncHandler(async (req, res, next) => {
	const category = await Categories.findById(req.params.id).exec();

	res.render('category_update', {
		title: 'Update Category',
		cat: category,
	});
});

// POST - Update Category
exports.updateCategory_POST = [
	// Validate/Sanitize Name
	body('name', 'Name must not be empty')
		.trim()
		.isLength({min: 3})
		.escape(),
	// Validate/Sanitize Desc
	body('desc', 'Description must contain at least 5 characters')
		.trim()
		.isLength({min: 5})
		.escape(),

	// First check if category type changed (main cat to subCat)
	asyncHandler(async (req, res, next) => {
		const category = await Categories.findById(req.params.id).exec();

		// Unchanged
		if ((category.subCategories == null && req.body.catType == 'sub') ||
			(category.subCategories != null && req.body.catType == 'main')) next();

		const proms = [];
		// Was a subCat, now a mainCat
		if (req.body.catType == 'main') {
			proms.push(category.updateOne({subCategories: []}).exec());

			// Remove category from old parent categories
			const oldParents = await Categories.find({subCategories: category._id})
				.exec();

			for (const parent of oldParents) {
				const filteredArray = parent.subCategories.filter((id) => {
					return !id.equals(category._id);
				});

				proms.push(parent.updateOne({subCategories: filteredArray}).exec());
			}

		// Was a mainCat, now a subCat
		} else if (req.body.catType == 'sub') {
			proms.push(category.updateOne({subCategories: null}).exec());
		}

		await Promise.all(proms); // Await all updated at once
		next();
	}),

	asyncHandler(async (req, res, next) => {
		if (req.body.newCat) return next();


		const errs = validationResult(req);
		// If there are errors render form again with sanitized data
		if (!errs.isEmpty()) {
			const category = await Categories.findById(req.params.id).exec();

			res.render('category_update', {
				title: 'Update Category',
				cat: category,
				name: req.body.name,
				desc: req.body.desc,
				errors: errs.array(),
			});
		}

		// Create new category with updated data
		// `subCategories` field left blank for now
		const updatedCat = await Categories.findByIdAndUpdate(req.params.id, {
			name: req.body.name,
			description: req.body.desc,
		});

		if (req.body.catType == 'sub') { // SubCat
			// Get Parents
			const parentCategories = await Categories.find({
				subCategories: {$ne: null},
			}, 'name subCategories')
				.sort('name')
				.exec();

			return res.render('subcategory_form', {
				title: 'Select Parent Category',
				category: updatedCat,
				categoryList: parentCategories,
			});
		} else if (req.body.catType == 'main') { // Main Cat
			// Get Sub-Categories
			const subCategories = await Categories.find({subCategories: null})
				.sort('name')
				.exec();

			return res.render('subcategory_form', {
				title: 'Select Sub-Categories',
				category: updatedCat,
				categoryList: subCategories,
			});
		}
	}),

	// Update `subCategories` field
	asyncHandler(async (req, res, next) => {
		const updatedCat = await Categories.findById(req.body.newCat).exec();

		// Main Category
		if (updatedCat.subCategories !== null) {
			const subCats = updatedCat.subCategories;

			// Iterate selected checkboxs
			for (const box in req.body) {
				if (box == 'newCat' || box == 'name' || box == 'desc') continue;

				// Push selected subCat ._id to array
				if (!updatedCat.subCategories.includes(box)) {
					subCats.push(new mongoose.Types.ObjectId(box));
				}
			}

			await updatedCat.updateOne({$set: {subCategories: subCats}})
				.exec();

		// Sub-Category
		} else if (updatedCat.subCategories === null) {
			const newParents = [];
			// Add `updatedCategory`s ._id to each parent's array
			for (const box in req.body) { // For each checked box
				if (box == 'newCat' || box == 'name' || box == 'desc') continue;

				// Get the corrosponding category
				const category = await Categories.findById(box).exec();
				const oldSubCats = category.subCategories;

				// Push the new sub-category's ID to array
				if (!oldSubCats.includes(updatedCat._id)) oldSubCats.push(updatedCat._id); // eslint-disable-line max-len

				// Update the category
				await category.updateOne({$set: {subCategories: oldSubCats}})
					.exec();

				newParents.push(category._id);
			}


			// Remove updatedCat from any old parents
			const allParents = await Categories.find({subCategories: updatedCat._id})
				.exec();

			for (let i = 0; i < allParents.length; i++) {
				const oldParent = allParents[i];

				// If oldParent is NOT in newParents
				if (!newParents.some((id) => id.equals(oldParent._id))) {
					const updatedArray = oldParent.subCategories.filter((item) => {
						return !item.equals(updatedCat._id);
					});

					await oldParent.updateOne({$set: {subCategories: updatedArray}})
						.exec();
				}
			}
		}

		res.redirect(updatedCat.url);
	}),
];
