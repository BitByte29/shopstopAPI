const app = require("./app");
const dotenv = require("dotenv");
dotenv.config({ path: "backend/config/config.env" });
const connectDatabase = require("./config/database");
const cloudinary = require("cloudinary").v2;

//Handling Uncaught Exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Server down due to unhandled Exception");
  process.exit(1);
});

connectDatabase();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const server = app.listen(process.env.PORT, () => {
  console.log(`Server - running at port ${process.env.PORT}`);
});

//Unhandled Promise rejections --> when connecting to db some problem may occur
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Server down due to unhandled Promise rejections");
  server.close(() => {
    process.exit(1);
  });
});
