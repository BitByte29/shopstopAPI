const express = require("express");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const {
  registerUser,
  loginUser,
  logout,
  forgotPassword,
  changePassword,
  getUserDetails,
  updatePassword,
  updateProfile,
  getAllUsers,
  getSingleUser,
  deleteUser,
  updateRole,
  getStats,
} = require("../controllers/userController");
const Router = express.Router();

//Here the image is the name of input element in which file is being uploaded
// Router.route("/register").post(upload.single("avatar"), registerUser);

Router.route("/register").post(registerUser);
Router.route("/login").post(loginUser);
Router.route("/logout").get(isAuthenticatedUser, logout);
Router.route("/update").put(isAuthenticatedUser, updateProfile);
Router.route("/me").get(isAuthenticatedUser, getUserDetails);
Router.route("/password/forgot").post(forgotPassword);
Router.route("/password/reset/:token").put(changePassword);
Router.route("/password/update").put(isAuthenticatedUser, updatePassword);

Router.route("/admin/users").get(
  isAuthenticatedUser,
  authorizeRoles("admin"),
  getAllUsers
);
Router.route("/admin/user/:id")
  .get(isAuthenticatedUser, authorizeRoles("admin"), getSingleUser)
  .put(isAuthenticatedUser, authorizeRoles("admin"), updateRole)
  .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteUser);

Router.route("/admin/stats").get(
  isAuthenticatedUser,
  authorizeRoles("admin"),
  getStats
);

module.exports = Router;
