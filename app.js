const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController.js');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.enable('trust proxy');
//*Tested Implementing CORS this code can be use later on
app.use(cors());
//Preflight request
app.options('*', cors());

// Access-Control-Allow-Origin *
// app.use(
//   cors({
//     origin: 'http://localhost:3000',
//     credentials: true
//   })
// );

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
//Test middleware to watch the value of the RAW req object
// app.use((req, res, next) => {
//   console.log(req);

//   next();
// });

//*1) Global Middleware
//Serving static assets
app.use(express.static(path.join(__dirname, 'public')));
//Set Security HTTP headers
app.use(helmet());

//Development logging
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//Limit request from same API
const limiter = rateLimit({
  // this is a middleware function base on Object.createMiddleware
  max: 100, //Number of request
  windowMs: 60 * 60 * 1000, //Time in which above number of request can be made
  message: 'Too many requests from this IP, please try again in an hour'
});

app.use('/api', limiter);

app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

//Body Parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
//to get data from the form
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//Data sanitization against NOSQL query injection
app.use(mongoSanitize());

//Data sanitization agaist XSS
app.use(xss());

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

app.use(compression());

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) Routers
//3.1 View Routes
app.use('/', viewRouter);

//3.2 Api routes

app.use('/api/v1/tours', tourRouter); //Passing router as middleware
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//this will execulte after above middleware has finished.
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server`
  // });
  // const err = new Error(`Can't find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// app.use((req, res, next) => {
//   console.log('Hello from the middleware ');
//   req.requestTime = new Date().toISOString();
//   next();
// });

app.use(globalErrorHandler); //Error controller with four arguments

module.exports = app;
