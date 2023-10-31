const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const sendToken = require("../utils/sendToken.js");
const cloudinary = require("cloudinary").v2;

//For stats
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Sales = require("../models/saleModel");

//___________________________________________________________Stats______________________________________________________//

exports.getStats = catchAsyncError(async (req, res, next) => {
  const users = await User.find();
  const products = await Product.find();
  const orders = await Order.find();

  const usersSize = users.length;
  const productsSize = products.length;
  const ordersSize = orders.length;

  var totalamount = 0;
  orders.forEach((order) => {
    totalamount += order.totalPrice;
  });

  const inStock = products.filter((product) => product.stock !== 0).length;

  const outOfStock = productsSize - inStock;
  const sales = await Sales.find();

  res.status(200).json({
    data: {
      usersSize,
      productsSize,
      ordersSize,
      totalamount,
      inStock,
      outOfStock,
      sales,
    },
  });
});

//___________________________________________________________User______________________________________________________////___________________________________________________________Methods______________________________________________________//

exports.registerUser = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;
  let avatarData = {};

  if (req.body.avatar) {
    const myCloud = await cloudinary.uploader.upload(req.body.avatar, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });
    avatarData = {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    };
  } else {
    avatarData = {
      public_id: "default_avatar_id",
      url: "/user.jpg",
    };
  }

  const user = await User.create({
    name,
    email,
    password,
    avatar: avatarData,
  });

  res.status(201).json({ message: "Account created successfully." });
});
//___________________________________________________________Login______________________________________________________//
exports.loginUser = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Enter both Email and password.", 401));
  }

  const user = await User.findOne({ email }).select("+password"); //to select password field as well
  if (!user) {
    return next(new ErrorHandler("Invalid credientials.", 401));
  }

  //Here if comparePassword return a promise so we have to await it.
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid credientials.", 401));
  }
  sendToken(user, 200, res);
});
//-----------------------------------------------------------Logout------------------------------------------------------//

exports.logout = catchAsyncError(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    sameSite: "None",
    httpOnly: true,
    secure: true,
  });

  res.status(200).json({ success: true, message: "Logged Out" });
});

//-----------------------------------------------------------Details------------------------------------------------------//

exports.getUserDetails = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id); //the user is loggined so it is going to be there for sure`````
  res.status(200).json({ user });
});

//Password management----------------------------------------------
// Forgot password--> when reached -> create a passwordresettken hash and save it in dbase for the uses and sends email with the reset token without hash

//-----------------------------------------------------------Password------------------------------------------------------//

exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${process.env.FRONTEND_URL}/#/password/reset/${resetToken}`;

  const message = `Your password reset token is this: \n\n ${resetPasswordUrl}. \n\nIf you have not requested password change please ignore it.`;

  // Now if mail is not send we have to make the resetToken and Expire to undefined
  try {
    await sendEmail({
      email: user.email,
      subject: `ShopStop Password Recovery.`,
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email send to ${user.email} successfully.`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(error.message, 500));
  }
});

//Change password--> takes the random crypto generated as req.param.token convert into hash check with the existing has for the used and updates password  also have created a userSchema.pre("save") to hash if password is being updaed before saving
exports.changePassword = catchAsyncError(async (req, res, next) => {
  //Creating the hashing
  // console.log("Password: ", req.body.password);
  // console.log("Password confirm: ", req.body.confirmPassword);
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  // console.log(req.params.token);
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(
      new ErrorHandler("Reset password token invalid or expired.", 400)
    );
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password mismatch.", 404));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendToken(user, 200, res);
});

//Update password when the user is logged in and wants to change password wilingly

//-----------------------------------------------------------Update------------------------------------------------------//

exports.updatePassword = catchAsyncError(async (req, res, next) => {
  let user = await User.findById(req.user.id).select("+password");
  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid Old Password.", 401));
  }
  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password do not match.", 401));
  }
  user.password = req.body.confirmPassword;
  await user.save();
  sendToken(user, 200, res);
});

exports.updateProfile = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
  };

  if (req.body.avatar) {
    const imgPublicId = req.user.avatar.public_id;
    const del = await cloudinary.uploader.destroy(`${imgPublicId}`);
    console.log("deleted", del);
    const myCloud = await cloudinary.uploader.upload(req.body.avatar, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });
    avatarData = {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    };
    newUserData.avatar = avatarData;
  }

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({ success: true, message: "Profile updated.", user });
});

//If any admin wants to check total no. of users
//-----------------------------------------------------------Admin------------------------------------------------------//
//-----------------------------------------------------------Access------------------------------------------------------//

exports.getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({ success: true, users });
});

exports.getSingleUser = catchAsyncError(async (req, res, next) => {
  const user = await User.find({ _id: req.params.id });
  if (!user) {
    return next(
      new ErrorHandler(`User with id ${req.params.id} does not exist.`)
    );
  }
  res.status(200).json({ success: true, user });
});

//Delete user
exports.deleteUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findByIdAndDelete({ _id: req.params.id });
  cloudinary.uploader
    .destroy(`${user.avatar.public_id}`)
    .then((result) => console.log(result));
  if (!user) {
    return next(
      new ErrorHandler(`User with id ${req.params.id} does not exist.`)
    );
  }
  // await user.remove();

  res.status(200).json({
    success: true,
    message: `${user.name}'s account deleted. `,
  });
});

//Update role
exports.updateRole = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    // email: req.body.email,
    // name: req.body.name,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({ success: true, message: "Profile updated." });
});
