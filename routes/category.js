const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const controller = require('../controllers/categoryController');

/* GET Categories list */
router.get('/', controller.categoryList);

// GET Create Category
router.get('/new', controller.createCategory);

// POST Create Category
router.post('/new', controller.createCategory_POST);

// GET Category Detail
router.get('/:id', controller.categoryDetail);

// GET Delete Category Page
router.get('/:id/delete', controller.deleteCategory);

// POST Delete Category Page
router.post('/:id/:action/delete', controller.deleteCategory_POST);

// GET Update Category Page
router.get('/:id/update', controller.updateCategory);

// POST Update Category Page
router.post('/:id/update', controller.updateCategory_POST);


module.exports = router;
