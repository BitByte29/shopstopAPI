const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Sales = require("../models/saleModel");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncError = require("../middleware/catchAsyncError");

//Create a order
exports.newOrder = catchAsyncError(async (req, res, next) => {
  const {
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body.orderDetails;

  // console.log(...req.body);

  // console.log(
  //   "Logged back: ",
  //   shippingInfo,
  //   orderItems,
  //   paymentInfo,
  //   itemsPrice,
  //   taxPrice,
  //   shippingPrice,
  //   totalPrice
  // );

  const order = await Order.create({
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    createdAt: Date.now(),
    user: req.user._id,
  });

  res.status(200).json({ success: true, order });
});

//Get the order deatils with id in params
exports.getSingleOrder = catchAsyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }
  res.status(200).json({ success: true, message: "ffromSIngle", order });
});

//Get all the orders of the logined user
exports.myOrders = catchAsyncError(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });

  res.status(200).json({ success: true, orders });
});

//Update a order and also create data on sales
exports.updateOrder = catchAsyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  if (req.body.orderStatus === "Shipped") {
    order.orderItems.forEach(
      async (order) => await updateStock(order.product, order.quantity)
    );
    await Sales.create({ amount: order.totalPrice });
  }
  if (order.orderStatus === "Delivered") {
    return next(new ErrorHandler("Order already Delivered", 401));
  }

  order.orderStatus = req.body.orderStatus;

  if (req.body.orderStatus === "Delivered") {
    order.deliveredAt = Date.now();
  }
  await order.save({ validateBeforeSave: false });

  res
    .status(200)
    .json({ success: true, message: `Order ${order.orderStatus}.`, order });
});
//Helper fuction for update order.
async function updateStock(id, quantity) {
  const product = await Product.findById(id);
  product.stock -= quantity;
  await product.save({ validateBeforeSave: false });
}

//Delete a order
exports.deleteOrder = catchAsyncError(async (req, res, next) => {
  //Whenever we take id from params do params.id not params._id as the route is localhost/api/v1/order
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  res.status(200).json({
    success: true,
    message: `Order of amount ${order.totalPrice} deleted.`,
  });
});

//For admin to look at every order
exports.getAllOrders = catchAsyncError(async (req, res, next) => {
  const orders = await Order.find().populate("user", "name email");
  let totalAmount = 0;
  orders.forEach((order) => (totalAmount += order.totalPrice));

  res.status(200).json({ success: true, totalAmount, orders });
});

//Change status of an order delived, processing
// exports.updateStatus = catchAsyncError(async (req, res, next) => {
//   const orders = await Order.find({ user: req.params._id });
//   orders.status = req.body.status;
//   await orders.save();
//   res.status(200).json({ success: true, orders });
// });
