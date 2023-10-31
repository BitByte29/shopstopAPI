const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

function generatePublicId() {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const year = now.getFullYear().toString().slice(-2); // Last two digits of the year
  const secondsOfDay =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const formattedPublicId = `user-${day}-${month}-${year}-s${secondsOfDay}`;
  return formattedPublicId;
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    // public_id: (req, file) => generatePublicId(),
    folder: "demo", // Optional - specify a folder in Cloudinary
  },
});

const upload = multer({ storage });

module.exports = { upload };
