// Instruments/Items Control funcs
const Instruments = require('../models/Instruments');
const Categories = require('../models/Categories');
const asyncHandler = require('express-async-handler');
const {body, validationResult} = require('express-validator');
const authenticateUser = require('../public/javascripts/adminAuth');
const multer = require('multer');
const upload = multer();

exports.itemsList = asyncHandler(async (req, res, next) => {
	const items = await Instruments.find({}).sort('category subCategory').exec();

	res.render('items_list', {
		title: 'Instruments & Equipment',
		items,
	});
});

exports.createItem = asyncHandler(async (req, res, next) => {
	const categories = await Categories.find({
		subCategories: {$ne: null},
	}).sort('name').exec();

	res.render('item_form', {
		title: 'Add an Item',
		cats: categories,
	});
});

exports.createItem_POST = [
	upload.single('img'),

	// Validate fields / Sanitize
	body('name', 'Name must not be empty')
		.trim()
		.isLength({min: 5})
		.withMessage('Name must have at least 5 characters')
		.escape(),
	body('desc', 'Description must not be empty')
		.trim()
		.isLength({min: 1})
		.escape(),

	// Create item
	asyncHandler(async (req, res, next) => {
		if (req.body.newItem) return next();

		// Extract errors
		const errs = validationResult(req);

		// Create item with sanitized data
		const itemConfig = {
			name: req.body.name,
			description: req.body.desc,
			category: req.body.category,
			price: parseFloat(req.body.price),
			stock: req.body.stock,
		};
		if (req.body.brand.length > 0) itemConfig.brand = req.body.brand;
		// If an image is given
		if (req.file) {
			itemConfig.img = {
				mimeType: req.file.mimetype,
				buffer: req.file.buffer,
			};
		}

		const item = new Instruments(itemConfig);

		// If there are errors
		if (!errs.isEmpty()) {
			// Re-render form with sanitized data
			const cats = await Categories.find({subCategories: {$ne: null}}).exec();

			res.render('item_form', {
				title: 'Add an Item',
				cats,
				name: req.body.name,
				desc: req.body.desc,
				brand: req.body.brand,
				category: req.body.category,
				price: req.body.price,
				stock: req.body.stock,
				errs: errs.array(),
			});
			return;
		}

		await item.save();

		// Check if there are sub-categories available
		const category = await Categories.findById(req.body.category)
			.populate('subCategories')
			.exec();
		if (category.subCategories.length > 0) {
			// Render sub-category select
			return res.render('item_subcat_form', {
				title: 'Select a Sub-Category',
				item: item,
				subCategories: category.subCategories,
			});
		} else {
			return res.redirect(item.url);
		}
	}),
	// Optionally select sub-category, if there are any
	asyncHandler(async (req, res, next) => {
		const item = await Instruments.findById(req.body.newItem).exec();

		// Add subCat to Item
		if (req.body.subCat != 'none') {
			await item.updateOne({subCategory: req.body.subCat}).exec();
		}

		// Go to Item Detail Page
		res.redirect(item.url);
	}),
];

// GET Image
exports.itemImg = asyncHandler(async (req, res) => {
	const item = await Instruments.findById(req.params.id, 'img').exec();

	// Serve the image buffer
	res.set('Content-Type', item.img.mimeType);
	res.send(item.img.buffer);
});

exports.itemsInCategory = asyncHandler(async (req, res, next) => {
	// First GET items in category
	let items = await Instruments.find({category: req.params.id})
		.populate('category')
		.sort('name').exec();

	let empty = false;
	let title;
	// Then, check if the given category was a sub-category
	if (items.length === 0) {
		items = await Instruments.find({subCategory: req.params.id})
			.populate('subCategory')
			.sort('name').exec();

		// If items were found - Set title to subCat
		if (items.length > 0) title = items[0].subCategory.name;

		else { // If still no items are found
			const category = await Categories.findById(req.params.id, 'name').exec();
			title = category.name;
			empty = true;
		}
	} else title = items[0].category.name;

	// Finally, render page
	// Same template as `itemsList`
	res.render('items_list', {
		title: title + ' Inventory',
		items,
		empty,
	});
});

exports.itemDetail = asyncHandler(async (req, res, next) => {
	// Get item
	const item = await Instruments.findById(req.params.id)
		.populate(['category', 'subCategory']);

	res.render('item_detail', {
		// `Jasmine Accoustic Guitar`
		title: `${item.brand ? item.brand : item.name} ` +
			`${item.subCategory ? item.subCategory.name : ''} ` +
			item.category.name,
		item,
	});
});

exports.deleteItem = asyncHandler(async (req, res, next) => {
	const item = await Instruments.findById(req.params.id, 'name').exec();

	res.render('item_delete', {
		title: 'Delete Item',
		item: item,
	});
});

exports.deleteItem_POST = [
	authenticateUser,
	// User is authorized - Delete item
	asyncHandler(async (req, res, next) => {
		// Item doesnt have dependencies to delete
		// Just delete item
		await Instruments.findByIdAndDelete(req.params.id).exec();

		// Redirect to Items List
		res.redirect('/inventory');
	}),
];

exports.updateItem = asyncHandler(async (req, res, next) => {
	// Render same form as 'createItem' with data already filled in
	const [categories, item] = await Promise.all([
		Categories.find({subCategories: {$ne: null}}, 'name')
			.sort('name').exec(),
		Instruments.findById(req.params.id).exec(),
	]);

	res.render('item_form', {
		title: 'Update Item',
		cats: categories,
		name: item.name, desc: item.description,
		brand: item.brand || '',
		price: item.price, stock: item.stock,
		category: item.category,
		img: item.img,
	});
});

exports.updateItem_POST = [
	upload.single('img'),

	// Authorize User
	authenticateUser,

	// Sanitize data
	body('name', 'Name must not be empty')
		.trim()
		.isLength({min: 5})
		.withMessage('Name must have at least 5 characters')
		.escape(),
	body('desc', 'Description must not be empty')
		.trim()
		.isLength({min: 1})
		.escape(),

	// User is authorized - Update item
	asyncHandler(async (req, res, next) => {
		if (req.body.newItem) return next();

		const errors = validationResult(req);

		// If there are errors
		if (!errors.isEmpty()) {
			// Re-render form with sanitized data
			const [cats, imgData] = await Promise.all([
				Categories.find({subCategories: {$ne: null}}).exec(),
				Instruments.findById(req.params.id, 'img').exec(),
			]);

			res.render('item_form', {
				title: 'Update Item',
				cats,
				name: req.body.name,
				desc: req.body.desc,
				brand: req.body.brand,
				category: req.body.category,
				price: req.body.price,
				stock: req.body.stock,
				img: imgData.img,
				errs: errors.array(),
			});
			return;
		}

		const itemConfig = {
			name: req.body.name,
			description: req.body.desc,
			category: req.body.category,
			price: req.body.price,
			stock: req.body.stock,
		}; // Brand not required
		if (req.body.brand) itemConfig.brand = req.body.brand;
		if (req.file || req.body.file) {
			const path = req.file ? req.file : JSON.parse(req.body.file);
			itemConfig.img = {
				buffer: path.buffer,
				mimeType: path.mimeType,
			};
		}

		const item = await Instruments.findByIdAndUpdate(req.params.id, itemConfig);
		if (req.body.removeImg == 'on') { // If img needs to be removed
			await item.updateOne({$unset: {img: ''}});
		}

		// Remove brand if brand is empty
		if (!req.body.brand) {
			await item.updateOne({$unset: {brand: ''}}).exec();
		}

		// Check if selected category has sub-categories
		const category = await Categories.findById(req.body.category)
			.populate('subCategories').exec();
		if (category.subCategories.length > 0) {
			return res.render('item_subcat_form', {
				title: 'Select a Sub-Category',
				item: item,
				subCategories: category.subCategories,
				auth: req.body.pass,
			});
		}

		next();
	}),
	asyncHandler(async (req, res, next) => {
		const item = await Instruments.findById(req.params.id).exec();

		// Add sub-category if one is selected
		if (req.body.subCat && req.body.subCat != 'none') {
			await item.updateOne({
				subCategory: req.body.subCat,
			}).exec();
		} else { // Remove sub-category if one is NOT selected
			await item.updateOne({
				$unset: {subCategory: ''},
			}).exec();
		}

		res.redirect(`/inventory/${item._id}`);
	}),
];
