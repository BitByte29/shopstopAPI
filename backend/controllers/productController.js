const Product = require("../models/productModel");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const ApiFeatures = require("../utils/apiFeatures");
const cloudinary = require("cloudinary").v2;

//-----------------------------------------------Products Get---------------------------------------------------//

exports.getAllProducts = catchAsyncError(async (req, res) => {
  const resultPerPage = 8;
  const apiFeature = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter();

  const products1 = await apiFeature.query;
  const productsCount = products1.length;

  const apiFeature2 = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter()
    .pagination(resultPerPage);
  const products = await apiFeature2.query;

  const pages =
    productsCount % resultPerPage === 0
      ? Math.round(productsCount / resultPerPage)
      : Math.floor(productsCount / resultPerPage) + 1;

  res.status(200).json({
    total: products.length,
    products,
    resultPerPage,
    totalPages: pages,
  });
});

exports.getAllProductsAdmin = catchAsyncError(async (req, res, next) => {
  const products = await Product.find();
  res.status(200).json({ products, totalProducts: products.length });
});

exports.getProductDetails = catchAsyncError(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("Product not found.", 404));
  }
  res.status(200).json(product);
});

//-----------------------------------------------Products Post---------------------------------------------------//

//Only for Admin  Create / Update / Delete
exports.createProduct = catchAsyncError(async (req, res, next) => {
  const { name, stock, description, price, category } = req.body;
  // console.log(name, stock, description, price, category);
  let imagesData = [];
  if (typeof req.body.images === "string") {
    imagesData.push(req.body.images);
  } else {
    imagesData = req.body.images;
  }
  let imgLinks = [];
  for (let i = 0; i < imagesData.length; i++) {
    const result = await cloudinary.uploader.upload(imagesData[i], {
      folder: "products",
      width: 500,
      crop: "scale",
    });
    imgLinks.push({
      public_id: result.public_id,
      url: result.secure_url,
    });
  }
  req.body.images = imgLinks;
  req.body.createdBy = req.user._id;
  req.body.stock = Number(req.body.stock);
  req.body.price = Number(req.body.price);

  // const productData = {
  //   name,
  //   description,
  //   stock: Number(stock),
  //   price: Number(price),
  //   category,
  //   images: imagesData,
  //   createdBy: req.user._id,
  // };

  const product = await Product.create(req.body);
  res.status(200).json({
    message: "Product created successfully",
    product,
  });
  // next();
});

//-----------------------------------------------Products Update---------------------------------------------------//

exports.updateProduct = catchAsyncError(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  let c = req.body.productData;
  if (!product) {
    // return res.status(500).json({ message: "Product not found." });
    return next(new ErrorHandler("Product not found.", 404));
  }
  product = await Product.findByIdAndUpdate(req.params.id, c, {
    new: true,
    runValidators: false,
    useFindAndModify: false,
  });

  res.status(200).json({ product, message: "Product updated." });
});

//-----------------------------------------------Products Delete---------------------------------------------------//

exports.deleteProduct = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found.", 404));
  }
  const images = product.images;
  images.forEach(async (image) => {
    const result = await cloudinary.uploader
      .destroy(`${image.public_id}`)
      .then((res) => console.log(res));
  });
  await Product.deleteOne({ _id: req.params.id });
  res.status(200).json({ message: "Product deleted" });
});

//-----------------------------------------------Reviews---------------------------------------------------//
//-----------------------------------------------Products---------------------------------------------------//

exports.getProductReviews = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.query.productId);
  if (!product) {
    return next(new ErrorHandler("Product not found.", 404));
  }
  res.status(200).json({
    success: true,
    reviews: product.reviews,
    productName: product.name,
  });
});

exports.createProductReview = catchAsyncError(async (req, res, next) => {
  //Finds the product for which review will be added
  //Checks if the user has already gave a review then its updated or else a new review is created and pushed in reviews array.

  const { rating, comment, productId } = req.body;
  const review = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    createdAt: Date.now(),
    comment,
  };
  const product = await Product.findById(productId);
  const isReviewed = product.reviews.find((rev) => {
    return rev.user.toString() === req.user._id.toString();
  });
  if (isReviewed) {
    product.reviews.forEach((rev) => {
      if (rev.user.toString() === req.user._id.toString()) {
        (rev.rating = rating),
          (rev.comment = comment),
          (rev.createdAt = Date.now());
      }
    });
  } else {
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }
  let avg = 0;
  product.reviews.forEach((rev) => {
    avg += rev.rating;
  });

  product.rating = avg / product.reviews.length;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Review added.", product });
});

exports.deleteReview = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.query.productId);
  if (!product) {
    return next(new ErrorHandler("Product not found.", 404));
  }
  // product.reviews.find(rev=> return rev._id.toString()=== req.body.reviewId.toString());
  const reviews = product.reviews.filter(
    (rev) => rev._id.toString() !== req.params.id.toString()
  );

  //After filtering out the unwanted revview calulate the avg again
  let avg = 0;
  reviews.forEach((rev) => {
    avg += rev.rating;
  });
  product.reviews = reviews;
  product.rating = avg / reviews.length;
  product.numOfReviews = reviews.length;
  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, reviews: product.reviews });
});

exports.voteReview = catchAsyncError(async (req, res, next) => {
  //Finds the product then finds the review increase its likes or dislikes
  //Currently not user checked, single person can like multiple time.

  const { reviewId, like = false, productId } = req.body;
  let message = "reviewNotFound";
  const product = await Product.findById(productId);

  product.reviews.forEach((rev) => {
    if (rev._id.toString() === reviewId) {
      if (like) {
        rev.likes = rev.likes + 1;
        message = "Review Liked";
      } else {
        rev.dislikes = rev.dislikes + 1;
        message = "Review disliked";
      }
    }
  });
  await product.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message });
});

//Create a new review or update Privious
