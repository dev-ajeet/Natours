// const axios = require('axios').default;
const Tour = require('../models/tourModels');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert =
      "Your bookings was successful! Please check your email for confirmation. If you booking doesn't show here immediatly, please come back later";
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  //1) Get all the tour data from our collection
  const tours = await Tour.find();
  //   const toursFetch = await axios.get('http://127.0.0.1:3000/api/v1/tours/');
  //   const tours = toursFetch.data.data.data;
  //   console.log(toursFetch.data.data.data);

  //2) Build template

  //3)Render that template using tour data from 1

  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  //)1 Get the data, for the requested tour(including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });
  if (!tour) {
    throw new AppError('There is no tour with that name', 404);
  }
  //   const tourFetch = await axios.get(
  //     `http://127.0.0.1:3000/api/v1/tours/${req.params.slug}`
  //   );
  //   const tour = tourFetch.data.data.doc;
  //   console.log(tourFetch.data.data.doc);
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Login'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.getMyTours = catchAsync(async (req, res) => {
  console.log('Inside getMyTours');
  //We will find all the tours that the user has booked. So first we need to find all the bookings for the currently logged-in users which will then give us a bunch of tours ID, then we have to find the tours with those ids

  //We could also do a virtual populate on the tours
  const bookings = await Booking.find({ user: req.user.id });
  console.log(bookings);
  //these bookings now contain all the booking documents for the current user, but it only gives us the tour id. Now we will find the tours with the return ids
  //Next step will be create an array of all the IDs and then after that query for tours that have one of these IDs.
  const tourIDs = bookings.map(el => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });
  console.log(tours);
  //This will select all the tours which have an ID which is in the tourIDs array
  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser
  });
});
