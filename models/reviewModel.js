// review /rating / careatedAt / ref to tour /  ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModels');
// const AppError = require('./../utils/appError');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      defaut: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'tours',
      required: [true, 'Review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  //   .populate({
  //     path: 'tour',
  //     select: '-guides name'
  //   });
  next();
});

//In the review model we're gonna create a new function which will take in a tour ID (is the ID of the tour to which reviews belongs to) and calculate the average rating and the number of ratings that exist in the Review collection for that exact tour.
//In the end function will also update the corresponding tour document
//Then in order to use that function we will use middleware to basically call this function each time there is a new review or one in update.

reviewSchema.statics.calcAverageRatings = async function(tourId) {
  //this keyword points to the current model i.e review here
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats[0].nRating,
    ratingsAverage: stats[0].avgRating
  }).catch(err => console.log(err));
};

//Each time new review is created stats will be updated
reviewSchema.post('save', function(doc) {
  //this points to the current review
  //We can't do like this as Review is not defined here
  // Review.calcAverageRatings(this.tour);
  //As this points to the current document, so constructor is the model who created the document
  doc.constructor.calcAverageRatings(doc.tour);
});

//Now we have to do the same thing for findByIdAndUpdate and findByIdAndDelete but these are query middleware not document middleware, in these 'this' keyword points to the current query
//We are using findOneAnd hooks because FindByIdAndUpdate is behind the scene is the scene is same
//Also we don't use post here as in post we don't have access to the query
/** 
 reviewSchema.pre(/^findOneAnd/, async function(next) {
  //As in a query middleware, we only have access to the query. We need to get access to the document, so we execute the query here.
  //We will use a trick to by assigning the value to this to pass value from pre middleware to post middleware
  this.revu = await this.findOne(); //Storing the current query docuemnt in the this, as to pass it into post hook
  next();
});
 */

/** reviewSchema.pre(/^findOneAnd/, async function(next) {
 * this.revu = await this.findOne();
 * next();*/

//We don't need to do all this wierd shit, as we have the access to the created document as a argument in the function of post.

reviewSchema.post(/^findOneAnd/, async function(doc) {
  if (doc) await doc.constructor.calcAverageRatings(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
