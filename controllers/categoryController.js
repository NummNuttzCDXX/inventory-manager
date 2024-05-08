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
