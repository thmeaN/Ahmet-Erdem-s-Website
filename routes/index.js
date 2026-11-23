const express = require("express");
const router = express.Router();

const homeController = require("../controllers/homeController");
const aboutController = require("../controllers/aboutController");
const certificatesController = require("../controllers/certificatesController");
const leadershipController = require("../controllers/leadershipController");
const projectsController = require("../controllers/projectsController");
const contactController = require("../controllers/contactController");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");

// Admin middleware - Admin panelini koruma
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect("/login");
};

// Sayfa Rotaları
router.get("/", homeController.getHomePage);
router.get("/hakkimda", aboutController.getAboutPage);
router.get("/sertifikalar", certificatesController.getCertificatesPage);
router.get("/liderlik", leadershipController.getLeadershipPage);
router.get("/projelerim", projectsController.getProjectsPage);

// İletişim Rotaları
router.get("/iletisim", contactController.getContactPage);
router.post("/contact", contactController.submitContactForm);
router.post("/iletisim", contactController.submitContactForm);

// Auth Rotaları
router.get("/login", authController.getLoginPage);
router.post("/login", authController.submitLogin);
router.get("/logout", authController.logout);

// Admin Rotaları (Korumalı)
router.get("/admin", requireAdmin, adminController.getAdminDashboard);

// Profil & Ana Sayfa
router.post("/admin/profile", requireAdmin, adminController.updateProfile);

// Hakkımda
router.post("/admin/about", requireAdmin, adminController.updateAbout);

// Projeler CRUD
router.post("/admin/projects/add", requireAdmin, adminController.addProject);
router.post("/admin/projects/edit/:id", requireAdmin, adminController.updateProject);
router.post("/admin/projects/delete/:id", requireAdmin, adminController.deleteProject);
router.delete("/admin/projects/:id", requireAdmin, adminController.deleteProject);

// Sertifikalar CRUD
router.post("/admin/certificates/add", requireAdmin, adminController.addCertificate);
router.post("/admin/certificates/edit/:id", requireAdmin, adminController.updateCertificate);
router.post("/admin/certificates/delete/:id", requireAdmin, adminController.deleteCertificate);
router.delete("/admin/certificates/:id", requireAdmin, adminController.deleteCertificate);

// Liderlik & A.T.A.K.
router.post("/admin/leadership", requireAdmin, adminController.updateLeadership);

// Medya / Dosya Yükleme
router.post(
  "/admin/upload",
  requireAdmin,
  adminController.uploadMiddleware,
  adminController.uploadMedia,
);

// Mesaj Silme
router.delete("/admin/messages/:id", requireAdmin, adminController.deleteMessage);

module.exports = router;
