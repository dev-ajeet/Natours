const express = require('express');
const { protect, restrictTo } = require('./../controllers/authController.js');
const reviewRouter = require('./reviewRoutes');
// const reviewController = require('./../controllers/reviewController');

//*Tours API we want to expose to the world. We might want to allow other tour site to embed out tours into their own websites. Therefore we will not have any authorization on GET tour request

const {
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  tourStats,
  monthlyPlan,
  getToursWithin,
  getDistances,
  uploadTourImages,
  resizeTourImages
} = require('../controllers/tourControllers');

const router = express.Router(); //now router object which can be used as middleware

// router.param('id'); //In this middleware we check the id if it is valid or not. Then send the request to the further routes

// router
//   .route('/:tourId/reviews')
//   .post(protect, restrictTo('user'), reviewController.createReview);

router.use('/:tourId/reviews', reviewRouter); //Mounting a router in router

router.route('/top-5-cheap').get(aliasTopTours, getAllTours);

router.route('/tour-stats').get(tourStats);
router
  .route('/monthly-plan/:year')
  .get(protect, restrictTo('admin', 'lead-guide', 'guide'), monthlyPlan);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(getToursWithin);

//Distance from the user point to all the tours in the collection
router.route('/distances/:latlng/unit/:unit').get(getDistances);

router
  .route('/')
  .get(getAllTours)
  .post(protect, restrictTo('admin', 'lead-guide'), createTour);

router
  .route('/:id')
  .get(getTour)
  .patch(
    protect,
    restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour
  )
  .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour);

module.exports = router;
