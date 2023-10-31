const ErrorHandler = require("../utils/errorHandler");
const catchAsyncError = require("./catchAsyncError");
const User = require("../models/userModel");
const JWT = require("jsonwebtoken");

//Checks if the user is logged in
exports.isAuthenticatedUser = catchAsyncError(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new ErrorHandler("Login to access this function/page.", 401));
  }

  const decodedData = JWT.verify(token, process.env.JWT_SECRET);
  //Here we are setting the user details to req only set when user is logined used for authenticated routes no need to pass user_id or such as when user sends a req then their details is stored
  req.user = await User.findById(decodedData.id);
  next();
});

//Checks loginned person role

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // console.log(roles);
    // console.log(req.user.role);
    if (!roles.includes(req.user.role)) {
      next(
        new ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resource`
        )
      );
    }
    next();
  };
};
