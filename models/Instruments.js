/* eslint-disable no-invalid-this */
// Instrument Model / Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const instrumentSchema = new Schema({
	name: {type: String, required: true},
	brand: {type: String},
	description: {type: String, required: true},
	price: {type: Number, required: true},
	// Reference the category item belongs to
	category: {type: Schema.Types.ObjectId, ref: 'Category', required: true},
	// Optional sub-category
	subCategory: {type: Schema.Types.ObjectId, ref: 'Category'},
	stock: {type: Number, required: true},
	img: {
		buffer: {type: Schema.Types.Buffer},
		mimeType: {type: String},
	},
});

// Pre-save hook to omit img field if it's not properly set
instrumentSchema.pre('save', function(next) {
	if (this.img && (!this.img.buffer || !this.img.mimeType)) {
		this.img = undefined;
	}
	next();
});

// Virtual for URL
instrumentSchema.virtual('url').get(function() {
	// Return the URL to get to this Guitar Detail page
	return `/inventory/${this._id}`;
});


module.exports = mongoose.model('Instrument', instrumentSchema);
