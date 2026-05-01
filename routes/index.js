const express = require("express");
const router = express.Router();
const pageController = require("../Controllers/pageController");

router.get("/", pageController.getIndexPage);

module.exports = router;
