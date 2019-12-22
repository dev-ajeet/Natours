const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'Tour name exceeds 40 characters'],
      minlength: [5, 'Tour name must be more than 5 characters']
      // validate: [validator.isAlpha, 'Tour name must only conatin characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'Tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'Tour should have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be easy, medium, or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating must below 5.0'],
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'Tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        // this only points to the current doc on New Document creation
        validator: function(value) {
          return value < this.price;
        },
        message: 'Discount ({VALUE}) must be below regular price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'Tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'Tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      //GeoJson
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
    // reviews: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Review'
    //   }
    // ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// tourSchema.index({ ratingsAverage: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function() {
  if (this.duration) return this.duration / 7;
});
//Virtual Populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id', //where value in the localField
  foreignField: 'tour' // is equal to the value in the foreignField
});

//* Document middleware: it runs before the .save() command .create() but not on .insertMany()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//* Embedding the guide document in the tours
/**tourSchema.pre('save', async function(next) {
  this.guides = await Promise.all(this.guides.map(id => User.findById(id)));
  next();
}); */

// tourSchema.pre('save', function(next) {
//   console.log('Saving document... ');
//   next();
// });

// tourSchema.post('save', function(doc, next) {
//   // doc is the document just saved to the database
//   consolelog(doc);
//   next();
// });

//*Query Middleware
tourSchema.pre(/^find/, function(next) {
  // tourSchema.pre('find', function(next) {
  //this keyword will point at the current query
  this.find({ secretTour: { $ne: true } }); //this query will be chained to the last query
  next();
});
tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -createdAt'
  });
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  // in 'docs' we get access to all the documents returned from the query

  next();
});

//*Aggregation middleware
tourSchema.pre('aggregate', function(next) {
  if (!Object.keys(this.pipeline()[0])[0] === '$geoNear')
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});

const Tour = mongoose.model('tours', tourSchema);

module.exports = Tour;
