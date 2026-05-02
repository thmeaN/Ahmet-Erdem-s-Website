const express = require("express");
const router = express.Router();
const pageController = require("../temp_kontrol/pageController");

router.get("/", pageController.getIndexPage);
router.post("/contact", pageController.submitContactForm);

// Admin routes
router.get("/admin", pageController.getAdminMessages);
router.delete("/admin/messages/:id", pageController.deleteMessage);

module.exports = router;
