/* eslint-disable new-cap */
// Inventory Items Router
const express = require('express');
const router = express.Router();
const controller = require('../controllers/instrumentController');

// GET all Items list
router.get('/', controller.itemsList);

// GET Items in Category
router.get('/category/:id');

// GET Item Detail page
router.get('/:id');


module.exports = router;
