const express = require('express');
const viewsControler = require('./../controllers/viewController');
const { isLoggedIn, protect } = require('./../controllers/authController');
// const { createBookingCheckout } = require('./../controllers/bookingController');

const router = express.Router();

//We will create a middleware which will run for all the requests. And it's that middleware, which will pick up the alert from the query string and put a alert message onto response.locals
router.use(viewsControler.alerts);

router.get('/', isLoggedIn, viewsControler.getOverview);
router.get('/tour/:slug', isLoggedIn, viewsControler.getTour);
router.get('/login', isLoggedIn, viewsControler.getLoginForm);
router.get('/me', protect, viewsControler.getAccount);
router.get('/my-tours', protect, viewsControler.getMyTours);

router.post('/submit-user-data', protect, viewsControler.updateUserData);

module.exports = router;
