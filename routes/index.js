const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");

// Admin middleware - Admin panelini koruma
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect("/login");
};

router.get("/", pageController.getIndexPage);
router.post("/contact", pageController.submitContactForm);

// Login routes
router.get("/login", pageController.getLoginPage);
router.post("/login", pageController.submitLogin);
router.get("/logout", pageController.logout);

// Admin routes (Protected)
router.get("/admin", requireAdmin, pageController.getAdminMessages);
router.delete(
  "/admin/messages/:id",
  requireAdmin,
  pageController.deleteMessage,
);

module.exports = router;
