const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const multer = require("multer");
const dataService = require("../services/dataService");

const CONTACTS_PATH = path.join(__dirname, "..", "data", "contacts.jsonl");

// Multer upload konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "public", "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    cb(null, `${safeBase}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Yalnızca görsel dosyaları yüklenebilir!"));
    }
  },
});

exports.uploadMiddleware = upload.single("image");

/**
 * Admin Paneli Ana Görünümü (Dashboard)
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    // 1. İletişim Mesajlarını Oku
    let data = "";
    try {
      data = await fs.readFile(CONTACTS_PATH, "utf8");
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    const allMessages = [];
    if (data) {
      for (const line of data.trim().split("\n")) {
        if (!line.trim()) continue;
        try {
          allMessages.push(JSON.parse(line));
        } catch (e) {
          console.error("Bozuk mesaj kaydı atlandı:", line);
        }
      }
    }
    allMessages.reverse();

    const searchQuery = String(req.query.search || "")
      .toLowerCase()
      .trim();
    let filteredMessages = allMessages;

    if (searchQuery) {
      filteredMessages = allMessages.filter(
        (msg) =>
          (msg.name && msg.name.toLowerCase().includes(searchQuery)) ||
          (msg.email && msg.email.toLowerCase().includes(searchQuery)) ||
          (msg.message && msg.message.toLowerCase().includes(searchQuery)),
      );
    }

    const stats = {
      totalMessages: allMessages.length,
      filteredCount: filteredMessages.length,
      todayCount: allMessages.filter((msg) => {
        const today = new Date().toDateString();
        const msgDate = new Date(msg.createdAt).toDateString();
        return today === msgDate;
      }).length,
      uniqueEmails: new Set(allMessages.map((m) => m.email).filter(Boolean)).size,
    };

    // 2. Site İçerik Verilerini Oku
    const siteData = await dataService.getSiteData();

    // 3. Yüklenen Medyaları Listele
    let uploadedFiles = [];
    try {
      const uploadDir = path.join(__dirname, "..", "public", "uploads");
      const files = await fs.readdir(uploadDir);
      uploadedFiles = files
        .filter((f) => f !== ".gitkeep")
        .map((f) => `/uploads/${f}`);
    } catch (e) {}

    const activeTab = req.query.tab || "messages";
    const notification = {
      success: req.query.success || "",
      error: req.query.error || "",
    };

    res.render("admin", {
      messages: filteredMessages,
      count: filteredMessages.length,
      searchQuery,
      stats,
      siteData,
      uploadedFiles,
      activeTab,
      notification,
    });
  } catch (error) {
    console.error("Admin paneli yükleme hatası:", error);
    res.status(500).send("Sunucu hatası: " + error.message);
  }
};

/**
 * Profil & Hero Güncelleme
 */
exports.updateProfile = async (req, res) => {
  try {
    const siteData = await dataService.getSiteData();
    const body = req.body;

    const highlights = [];
    if (body.highlight_title && Array.isArray(body.highlight_title)) {
      for (let i = 0; i < body.highlight_title.length; i++) {
        if (body.highlight_title[i]) {
          highlights.push({
            icon: body.highlight_icon[i] || "📌",
            badge: body.highlight_badge[i] || "",
            title: body.highlight_title[i] || "",
            description: body.highlight_desc[i] || "",
            linkText: body.highlight_linktext[i] || "İncele",
            linkUrl: body.highlight_linkurl[i] || "#",
          });
        }
      }
    }

    const newProfile = {
      ...siteData.profile,
      name: body.name || siteData.profile.name,
      statusBadge: body.statusBadge || "",
      location: body.location || "",
      tagline: body.tagline || "",
      avatar: body.avatar || siteData.profile.avatar,
      heroGreeting: body.heroGreeting || "",
      typewriterText: body.typewriterText || "",
      bioLead: body.bioLead || "",
      socials: {
        linkedin: body.linkedin || "",
        github: body.github || "",
        kaggle: body.kaggle || "",
        instagram: body.instagram || "",
        discord: body.discord || "",
        telegram: body.telegram || "",
      },
      highlights: highlights.length > 0 ? highlights : siteData.profile.highlights,
    };

    await dataService.updateSection("profile", newProfile);
    res.redirect("/admin?tab=profile&success=Profil%20ve%20Ana%20Sayfa%20bilgileri%20g%C3%BCncellendi!");
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    res.redirect("/admin?tab=profile&error=G%C3%BCncelleme%20ba%C5%9Far%C4%B1s%C4%B1z!");
  }
};

/**
 * Hakkımda Güncelleme
 */
exports.updateAbout = async (req, res) => {
  try {
    const siteData = await dataService.getSiteData();
    const body = req.body;

    // Biyografi paragrafları (satır satır ayrılır)
    const rawParagraphs = String(body.bioParagraphs || "")
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    // Odak Noktaları
    const focusPoints = [];
    if (body.focus_title && Array.isArray(body.focus_title)) {
      for (let i = 0; i < body.focus_title.length; i++) {
        if (body.focus_title[i]) {
          focusPoints.push({
            icon: body.focus_icon[i] || "🎯",
            title: body.focus_title[i] || "",
            description: body.focus_desc[i] || "",
          });
        }
      }
    }

    // Yetenek Kategorileri
    const skillCategories = [];
    if (body.skill_category_title && Array.isArray(body.skill_category_title)) {
      for (let i = 0; i < body.skill_category_title.length; i++) {
        if (body.skill_category_title[i]) {
          const rawTags = body.skill_category_tags[i] || "";
          const tags = rawTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          skillCategories.push({
            title: body.skill_category_title[i] || "",
            isAccent: body.skill_category_accent && body.skill_category_accent.includes(String(i)),
            tags,
          });
        }
      }
    }

    const newAbout = {
      ...siteData.about,
      breadcrumb: body.breadcrumb || "👤 Kendim Hakkında",
      title: body.title || siteData.about.title,
      subtitle: body.subtitle || siteData.about.subtitle,
      bioTitle: body.bioTitle || siteData.about.bioTitle,
      bioParagraphs: rawParagraphs.length > 0 ? rawParagraphs : siteData.about.bioParagraphs,
      focusPoints: focusPoints.length > 0 ? focusPoints : siteData.about.focusPoints,
      skillCategories: skillCategories.length > 0 ? skillCategories : siteData.about.skillCategories,
      ctaText: body.ctaText || siteData.about.ctaText,
    };

    await dataService.updateSection("about", newAbout);
    res.redirect("/admin?tab=about&success=Hakk%C4%B1mda%20sayfas%C4%B1%20g%C3%BCncellendi!");
  } catch (error) {
    console.error("Hakkımda güncelleme hatası:", error);
    res.redirect("/admin?tab=about&error=G%C3%BCncelleme%20ba%C5%9Far%C4%B1s%C4%B1z!");
  }
};

/**
 * Projeler CRUD
 */
exports.addProject = async (req, res) => {
  try {
    const body = req.body;
    const tags = String(body.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const techStack = String(body.techStack || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await dataService.addProject({
      name: body.name,
      tagline: body.tagline,
      featuredBadge: body.featuredBadge,
      tags,
      problemSolution: body.problemSolution,
      role: body.role,
      roleDescription: body.roleDescription,
      techStack,
      githubUrl: body.githubUrl,
      liveUrl: body.liveUrl,
      imageUrl: body.imageUrl,
    });

    res.redirect("/admin?tab=projects&success=Yeni%20proje%20ba%C5%9Far%C4%B1yla%20eklendi!");
  } catch (error) {
    console.error("Proje ekleme hatası:", error);
    res.redirect("/admin?tab=projects&error=Proje%20eklenemedi!");
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const tags = String(body.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const techStack = String(body.techStack || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await dataService.updateProject(id, {
      name: body.name,
      tagline: body.tagline,
      featuredBadge: body.featuredBadge,
      tags,
      problemSolution: body.problemSolution,
      role: body.role,
      roleDescription: body.roleDescription,
      techStack,
      githubUrl: body.githubUrl,
      liveUrl: body.liveUrl,
      imageUrl: body.imageUrl,
    });

    res.redirect("/admin?tab=projects&success=Proje%20g%C3%BCncellendi!");
  } catch (error) {
    console.error("Proje güncelleme hatası:", error);
    res.redirect("/admin?tab=projects&error=Proje%20g%C3%BCncellenemedi!");
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await dataService.deleteProject(id);
    if (req.accepts(["html", "json"]) === "json") {
      return res.status(200).json({ ok: true, message: "Proje silindi" });
    }
    res.redirect("/admin?tab=projects&success=Proje%20silindi!");
  } catch (error) {
    console.error("Proje silme hatası:", error);
    if (req.accepts(["html", "json"]) === "json") {
      return res.status(500).json({ ok: false, error: "Proje silinemedi" });
    }
    res.redirect("/admin?tab=projects&error=Proje%20silinemedi!");
  }
};

/**
 * Sertifikalar CRUD
 */
exports.addCertificate = async (req, res) => {
  try {
    const body = req.body;
    await dataService.addCertificate({
      title: body.title,
      issuer: body.issuer,
      description: body.description,
      imageUrl: body.imageUrl || "/Pictures/sertifika1.jpg",
      verifyUrl: body.verifyUrl,
    });
    res.redirect("/admin?tab=certificates&success=Yeni%20sertifika%20eklendi!");
  } catch (error) {
    console.error("Sertifika ekleme hatası:", error);
    res.redirect("/admin?tab=certificates&error=Sertifika%20eklenemedi!");
  }
};

exports.updateCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    await dataService.updateCertificate(id, {
      title: body.title,
      issuer: body.issuer,
      description: body.description,
      imageUrl: body.imageUrl,
      verifyUrl: body.verifyUrl,
    });
    res.redirect("/admin?tab=certificates&success=Sertifika%20g%C3%BCncellendi!");
  } catch (error) {
    console.error("Sertifika güncelleme hatası:", error);
    res.redirect("/admin?tab=certificates&error=Sertifika%20g%C3%BCncellenemedi!");
  }
};

exports.deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    await dataService.deleteCertificate(id);
    if (req.accepts(["html", "json"]) === "json") {
      return res.status(200).json({ ok: true, message: "Sertifika silindi" });
    }
    res.redirect("/admin?tab=certificates&success=Sertifika%20silindi!");
  } catch (error) {
    console.error("Sertifika silme hatası:", error);
    if (req.accepts(["html", "json"]) === "json") {
      return res.status(500).json({ ok: false, error: "Sertifika silinemedi" });
    }
    res.redirect("/admin?tab=certificates&error=Sertifika%20silinemedi!");
  }
};

/**
 * Liderlik & Topluluk Güncelleme
 */
exports.updateLeadership = async (req, res) => {
  try {
    const siteData = await dataService.getSiteData();
    const body = req.body;

    const rawParagraphs = String(body.descriptionParagraphs || "")
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    // İstatistikler
    const stats = [];
    if (body.stat_number && Array.isArray(body.stat_number)) {
      for (let i = 0; i < body.stat_number.length; i++) {
        if (body.stat_title[i] || body.stat_number[i]) {
          stats.push({
            id: `stat-${i + 1}`,
            icon: body.stat_icon[i] || "📌",
            number: body.stat_number[i] || "",
            title: body.stat_title[i] || "",
            description: body.stat_desc[i] || "",
            isHighlighted: body.stat_highlight && body.stat_highlight.includes(String(i)),
          });
        }
      }
    }

    // Temel İlkeler / Sütunlar
    const pillars = [];
    if (body.pillar_title && Array.isArray(body.pillar_title)) {
      for (let i = 0; i < body.pillar_title.length; i++) {
        if (body.pillar_title[i]) {
          pillars.push({
            id: `pillar-${i + 1}`,
            title: body.pillar_title[i] || "",
            description: body.pillar_desc[i] || "",
          });
        }
      }
    }

    const newLeadership = {
      ...siteData.leadership,
      clubName: body.clubName || siteData.leadership.clubName,
      roleTitle: body.roleTitle || siteData.leadership.roleTitle,
      subtitle: body.subtitle || siteData.leadership.subtitle,
      instagramUrl: body.instagramUrl || "",
      linkedinUrl: body.linkedinUrl || "",
      descriptionParagraphs: rawParagraphs.length > 0 ? rawParagraphs : siteData.leadership.descriptionParagraphs,
      stats: stats.length > 0 ? stats : siteData.leadership.stats,
      pillars: pillars.length > 0 ? pillars : siteData.leadership.pillars,
    };

    await dataService.updateSection("leadership", newLeadership);
    res.redirect("/admin?tab=leadership&success=Liderlik%20sayfas%C4%B1%20g%C3%BCncellendi!");
  } catch (error) {
    console.error("Liderlik güncelleme hatası:", error);
    res.redirect("/admin?tab=leadership&error=Liderlik%20bilgileri%20g%C3%BCncellenemedi!");
  }
};

/**
 * Dosya & Medya Yükleme
 */
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/admin?tab=media&error=Dosya%20se%C3%A7ilmedi!");
    }
    const publicUrl = `/uploads/${req.file.filename}`;
    if (req.accepts(["html", "json"]) === "json") {
      return res.status(200).json({ ok: true, url: publicUrl });
    }
    res.redirect(`/admin?tab=media&success=Dosya%20y%C3%BCklendi:%20${encodeURIComponent(publicUrl)}`);
  } catch (error) {
    console.error("Medya yükleme hatası:", error);
    res.redirect("/admin?tab=media&error=Dosya%20y%C3%BCklenirken%20hata%20olu%C5%9Ftu!");
  }
};

/**
 * Mesaj Silme (Geriye Uyumluluk)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    let data = "";
    try {
      data = await fs.readFile(CONTACTS_PATH, "utf8");
    } catch (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ ok: false, error: "Mesaj bulunamadı" });
      }
      throw err;
    }

    const messages = [];
    for (const line of data.trim().split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.id !== id) {
          messages.push(parsed);
        }
      } catch (e) {}
    }

    await fs.writeFile(
      CONTACTS_PATH,
      messages.length > 0
        ? messages.map((m) => JSON.stringify(m)).join("\n") + "\n"
        : "",
      "utf8",
    );

    res.status(200).json({ ok: true, message: "Mesaj silindi" });
  } catch (error) {
    console.error("Mesaj silme hatası:", error);
    res.status(500).json({ ok: false, error: "Sunucu hatasi" });
  }
};
