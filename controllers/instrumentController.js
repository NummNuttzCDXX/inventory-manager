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
