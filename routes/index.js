/* eslint-disable new-cap */
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const Instruments = require('../models/Instruments');
const Categories = require('../models/Categories');

/* GET home page. */
router.get('/', asyncHandler(async (req, res, next) => {
	// Get Counts
	const [invCount, catCount] = await Promise.all([
		Instruments.countDocuments({}).exec(),
		Categories.countDocuments({}).exec(),
	]);

	res.render('index', {
		title: 'Inventory Manager',
		invCount,
		catCount,
	});
}));

module.exports = router;
