const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {type: String, required:true},
    description:{type: String, required:true},
    imageUrl:{data: Buffer, 
        contentType: String}
},{ collection: 'category'})

const Category = mongoose.model('Category',categorySchema);

module.exports = Category;