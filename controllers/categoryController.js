// Category Control funcs
const Categories = require('../models/Categories');
const Instruments = require('../models/Instruments');
const asyncHandler = require('express-async-handler');

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
