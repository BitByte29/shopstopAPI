const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const JWT = require("jsonwebtoken");
const crypto = require("crypto"); //Builtin

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name."],
    maxLength: [30, "Name cannot exceed 30 characters."],
    minLength: [3, "Name should be bigger than 3 characters"],
  },
  email: {
    type: String,
    required: [true, "Please enter your Email."],
    unique: true,
    // The validator package is not natively integrated with Mongoose, so need to create a custom validator function to use it.
    validate: {
      validator: function (value) {
        return validator.isEmail(value);
      },
      message: "Please enter a valid Email.",
    },
  },
  password: {
    type: String,
    required: [true, "Please enter your Password."],
    minLength: [8, "Password should be bigger than 8 characters"],
    select: false,
  },
  avatar: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  role: {
    type: String,
    default: "user",
  },
  joinedOn: {
    type: Date,
    default: Date.now(),
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

//Using bcrypt before saving and using a normal function instead of arrow function to access this
// using userSchema.pre('save') to create action before save and check if the a field is modified using this.isModified('password')
// if not modified that means its a new password and has to be hashed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

//We can also create methods  which can be called on the objects of model
userSchema.methods.getJWTToken = function () {
  return JWT.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

//Compare Password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//Generate Password reset token
userSchema.methods.getResetPasswordToken = function () {
  //Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  //Hashing and using resetPasswordToken to userSchema
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
