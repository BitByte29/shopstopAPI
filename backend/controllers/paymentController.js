const catchAsyncError = require("../middleware/catchAsyncError");
const dotenv = require("dotenv");
dotenv.config({ path: "backend/config/config.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.processPayment = catchAsyncError(async (req, res, next) => {
  // const items = [
  //   {
  //     product: "6527c869fb20b5ab358a0a13",
  //     name: "Acer Swift 3",
  //     price: 3002,
  //     image:
  //       "https://images.unsplash.com/photo-1618424181497-157f25b6ddd5?auto=format&fit=crop&q=80&w=1000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bGFwdG9wJTIwY29tcHV0ZXJ8ZW58MHx8MHx8fDA%3D",
  //     stock: 8,
  //     quantity: 1,
  //     onSale: false,
  //     discount: 0,
  //   },
  // ];
  const items = req.body.updatedProducts;
  const lineItems = items.map((item) => ({
    price_data: {
      currency: "inr",
      product_data: {
        name: item.name,
        description: `Price is ${item.price} after adding 18% GST.`,
        // price: item.price,
        images: [item.image],
      },
      unit_amount: item.price * 100,
    },
    quantity: item.quantity,
  }));

  // console.log(process.env.STRIPE_SECRET_KEY);
  // console.log(items);
  try {
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/#/success?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/#/success?success=false`,
    });

    res.send({
      redirectUrl: session.url,
    });
    // res.redirect(303, session.url);
  } catch (err) {
    console.log(err.message);
    res.send({ redirectUrl: "error" });
  }
  // res.redirect(303, session.url);
  // next();
});

// exports.processPayment = catchAsyncError(async (req, res, next) => {
//   const myPayment = await stripe.paymentIntents.create({
//     amount: req.body.amount,
//     currency: "inr",
//     metadata: {
//       company: "ShopStop",
//     },
//   });

//   res
//     .status(200)
//     .json({ success: true, client_secret: myPayment.client_secret });
// });

exports.sendStripeApiKey = catchAsyncError(async (req, res, next) => {
  res.status(200).json({ stripeApiKey: process.env.STRIPE_API_KEY });
});
