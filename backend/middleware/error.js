const ErrorHandler = require("../utils/errorHandler");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  //Wrong mongodb id error....when the req.params.id length does not matches _id length then mongodb gives casting error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  //Mongoose duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} Entered.`;
    err = new ErrorHandler(message, 400);
  }

  //Wrong jwt token error
  if (err.name === "JsonWebTokenError") {
    const message = `Json web token invalid try again.`;
    err = new ErrorHandler(message, 400);
  }

  //JWT expire error
  if (err.name === "TokenExpiredError") {
    const message = `Json web token expired, try again.`;
    err = new ErrorHandler(message, 400);
  }

  res.status(err.statusCode).json({
    status: false,
    message: err.message,
  });
};
