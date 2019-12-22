const Review = require('../models/reviewModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
// const AppError = require('./../utils/appError');

exports.setToursUsersId = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

/**exports.createReview = catchAsync(async (req, res, next) => {
  const newReview = await Review.findOneAndUpdate(
    {
      tour: req.body.tour,
      user: req.body.user
    },
    req.body,
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({
    status: 'success',
    data: { review: newReview }
  });
}); */

exports.getAllReviews = factory.getAll(Review, {
  path: 'tour',
  select: '-guides name'
});

exports.createReview = factory.createOne(Review);

exports.getReview = factory.getOne(Review);
//this is not require as we are using upsert true in findOneAndUpdate
exports.updateReview = factory.updateOne(Review);
// exports.createReview = factory.createOne(Review);

exports.deleteReview = factory.deleteOne(Review);
