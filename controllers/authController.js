const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const generateJWT = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY
  });
};

const sendCookie = (tkn, req, res) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // send only secure connection
    httpOnly: true, // to prevent XSS attacks
    // sameSite: false
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };
  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // if (req.secure || req.headers['x-forwarded-proto'] === 'https')
  //   cookieOptions.secure = true;

  res.cookie('jwt', tkn, cookieOptions);
};

/** const createSendToken = (user, statusCode, res) => {
  const token = generateJWT(user._id);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};*/

exports.protect = catchAsync(async (req, res, next) => {
  /**  const asyncFunction = async (req, res, next) => {
    throw new Error('Just another error');
    console.log('Building protect handler');
    next();
  };
  asyncFunction(req, res, next).catch(err => console.log(err.message)); 
  */
  //1) Getting token and check if it's there

  // if (req.cookies.jwt && req.cookies.jwt === 'loggedout')
  //   throw new AppError('Successfully logged out');
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    throw new AppError(
      'You are not logged in. Please log in to get access',
      401
    );
  }
  //2) Verification of token
  /** const jwtVerify = tkn => {
    return new Promise((resolve, reject) => {
      jwt.verify(tkn, process.env.JWT_SECRET, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  };*/
  const jwtPayload = await promisify(jwt.verify)(token, process.env.JWT_SECRET); //if not verified this will throw an error

  //3) Check if the user is still in the database
  const existingUser = await User.findById(jwtPayload.id).select(
    '+passwordChangedAt'
  );
  if (!existingUser) {
    throw new AppError('User not found', 401);
  }
  //4) Check if the user changed password after the JWT was generated
  if (existingUser.changedPasswordAfter(jwtPayload.iat)) {
    throw new AppError('Password changed. Please login again.');
  }

  //Access granted to protected route
  req.user = existingUser;
  res.locals.user = existingUser;
  next();
});

//* Only for rendering pages based one user logged and there will be no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1) Verifies the token
      const jwtPayload = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //3) Check if the user is still in the database
      const existingUser = await User.findById(jwtPayload.id).select(
        '+passwordChangedAt'
      );
      if (!existingUser) {
        return next();
      }
      //3) Check if the user changed password after the JWT was generated
      if (existingUser.changedPasswordAfter(jwtPayload.iat)) {
        return next();
      }
      // There is a logged in user
      res.locals.user = existingUser;
      return next();
    } catch (error) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles us an array ['admin', 'lead']
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        'You are not authorization to perform this action',
        403
      );
    }
    next();
  };
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    password_confirm: req.body.password_confirm
  });
  const userData = filterObj(newUser._doc, 'name', 'email', 'role');
  const token = generateJWT(newUser._id);
  // newUser.password = undefined;
  // newUser.password_confirm = undefined;
  const url = `${req.protocol}://${req.get('host')}/me`;
  //*Sending Email to the client
  await new Email(userData, url).sendWelcome();
  //Send authentication cookie to the client - this might be dangrous here as we are sending the cookie with out two step verifiction.
  // sendCookie(token, res);
  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: userData
    }
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400); // this will goes to global app handler with or without catchAsync
  }

  const user = await User.findOne({ email }).select('+password'); // this will result a matching document

  if (!user || !(await user.verifyPassword(password)))
    throw new AppError('Invalid Email or Password', 401);

  const token = generateJWT(user._id);
  sendCookie(token, req, res);

  res.status(200).json({
    status: 'success',
    token
  });
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on Posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    throw new AppError('User not found', 404);
  }
  //2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3) Send it to user's email address

  try {
    // await Email({
    //   email: user.email,
    //   subject: 'Your Password reset token (valid for 10 min)',
    //   message: message
    // });
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/user/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token send to email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);
    throw new AppError('Error sending the email. Try again later.', 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: {
      $gte: Date.now()
    }
  });
  //2) If token has not expired, and there is a user, set the new password
  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }
  user.password = req.body.password;
  user.password_confirm = req.body.password_confirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3) Update the changedPasswordAt property for the current user
  //4 Log the user in, send the JWT to the user
  const token = generateJWT(user._id);
  res.status(200).json({
    status: 'success',
    token
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get the user from the collection
  const user = await User.findById(req.user.id).select('+password');

  //2) Check if the posted password is correct
  if (
    !req.body.oldPassword ||
    !(await user.verifyPassword(req.body.oldPassword))
  ) {
    throw new AppError('Wrong Password Entered', 401);
  }
  if (req.body.oldPassword === req.body.password) {
    throw new AppError('Password same as old password', 403);
  }
  //3) If so, then update the password field
  user.password = req.body.password;
  user.password_confirm = req.body.password_confirm;
  await user.save();

  //4) Log in user, send the JWT and the cookie
  const token = generateJWT(user._id);
  sendCookie(token, req, res);
  res.status(200).json({
    status: 'success',
    token
  });
});
