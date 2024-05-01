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
