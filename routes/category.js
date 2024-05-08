const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const controller = require('../controllers/categoryController');

/* GET Categories list */
router.get('/', controller.categoryList);

// GET Create Category
router.get('/new', controller.createCategory);

// POST Create Category
router.post('/new', controller.createCategory_POST);
// POST Create Sub-Category - Add parent category to new sub-cat
router.post('/new/sub', controller.createSubCategory_POST);

// GET Category Detail
router.get('/:id', controller.categoryDetail);


module.exports = router;
