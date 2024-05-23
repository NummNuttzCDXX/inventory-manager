/* eslint-disable new-cap */
// Inventory Items Router
const express = require('express');
const router = express.Router();
const controller = require('../controllers/instrumentController');

// GET all Items list
router.get('/', controller.itemsList);

// GET Create Item page
router.get('/new', controller.createItem);

// POST Create Item
router.post('/new', controller.createItem_POST);

// GET Items in Category
router.get('/category/:id', controller.itemsInCategory);

// GET Item Detail page
router.get('/:id', controller.itemDetail);

// GET Delete Item page
router.get('/:id/delete', controller.deleteItem);

// POST Delete Item
router.post('/:id/delete', controller.deleteItem_POST);


module.exports = router;
