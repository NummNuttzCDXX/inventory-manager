// Instruments/Items Control funcs
const Instruments = require('../models/Instruments');
const asyncHandler = require('express-async-handler');

exports.itemsList = asyncHandler(async (req, res, next) => {
	const items = await Instruments.find({}).sort('category subCategory').exec();

	res.render('items_list', {
		title: 'Instruments & Equipment',
		items,
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
