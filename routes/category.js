const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const controller = require('../controllers/categoryController');

/* GET Categories list */
router.get('/', controller.categoryList);

// GET Category Detail
router.get('/:id', controller.categoryDetail);


module.exports = router;
