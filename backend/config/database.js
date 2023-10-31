const mongoose = require("mongoose");

const connectDatabase = () => {
  mongoose
    .connect(process.env.DB_URL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    })
    .then(() => {
      console.log("DB Connection Successful");
    });
  //Used unhandled promise rejection in server.js
  // .catch((err) => {
  //   console.log("Not connected  " + err);
  // });
};

module.exports = connectDatabase;
