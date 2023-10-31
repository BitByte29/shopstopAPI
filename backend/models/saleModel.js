const mongoose = require("mongoose");
const sales = new mongoose.Schema({
  amount: {
    type: Number,
    default: 0,
  },
  saleDate: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Sales", sales);
