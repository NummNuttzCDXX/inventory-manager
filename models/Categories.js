/* eslint-disable no-invalid-this */
// Category Model / Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
	name: {type: String, required: true},
	description: {type: String, required: true},
	subCategories: [{type: Schema.Types.ObjectId, ref: 'Category'}],
});

// Virtual for URL
categorySchema.virtual('url').get(function() {
	// Return the URL to get to this Category Detail page
	return `/categories/${this._id}`;
});


module.exports = mongoose.model('Category', categorySchema);
