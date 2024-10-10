const mongoose = require('mongoose');
const Category = require('./category');

// schema 
const NutritionInfoSchema = new mongoose.Schema({
    calories: {
      type: Number,
      required: true
    },
    protein: {
      type: String,
      required: true
    },
    fat: {
      type: String,
      required: true
    },
    cholesterol: {
      type: String,
      required: true
    }
  });


const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
      },
      categoryId: {
        type: String,
        required: true,
        ref: 'Category' 
      },
      description: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      // unit: {
      //   type: Number,
      //   required: true
      // },
      stock: {
        type: Number,
        required: true
      },
      imageUrl: {
        type: String,
        required: true
      },
      tags: {
        type: [String],
        required: true
      },
      pieces: {
        type: Number,
        required: true
      },
      detailedDescription: {
        type: String,
        required: true
      },
      nutritionInfo: {
        type: NutritionInfoSchema,
        required: true
      },
      servings: {
        type: Number,
        required: true
      }
    }, {collection: 'product'});

    // model
    
    const product = mongoose.model('product', productSchema)

    module.exports = product;
    