// Instruments/Items Control funcs
const Instruments = require('../models/Instruments');
const Categories = require('../models/Categories');
const asyncHandler = require('express-async-handler');

exports.itemsList = asyncHandler(async (req, res, next) => {
	const items = await Instruments.find({}).sort('category subCategory').exec();

	res.render('items_list', {
		title: 'Instruments & Equipment',
		items,
	});
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
		title: `${item.brand} ${item.subCategory.name} ${item.category.name}`,
		item,
	});
});
