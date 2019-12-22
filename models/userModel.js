const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide your password'],
    minlength: [8, 'Password should be longer than 8'],
    select: false
  },
  password_confirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    select: false,
    validate: {
      //this only works on Save and .create
      validator: function(el) {
        return el === this.password;
      },
      message: "Passwords don't match"
    }
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now(),
    select: false
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now()
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  console.log('Inside pre hook');
  if (!this.isModified('password')) {
    console.log('password is unchanged');
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  this.passwordChangedAt = Date.now() - 1000;
  this.password_confirm = undefined;
  next();
});

userSchema.pre(/^find/, function(next) {
  // 'this' points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.verifyPassword = async function(userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

userSchema.methods.changedPasswordAfter = function(jwtTimestamp) {
  const passwordChangedAtTs = parseInt(
    this.passwordChangedAt.getTime() / 1000,
    10
  );
  // console.log(jwtTimestamp - passwordChangedAtTs);
  return jwtTimestamp < passwordChangedAtTs;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  //storing token as hash in the database
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken; //returning plaintext token
};

const User = mongoose.model('User', userSchema);

module.exports = User;
