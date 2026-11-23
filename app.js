require("dotenv").config();
const express = require("express");
const session = require("express-session");
const app = express();
const indexRoute = require("./routes/index");

// Trust proxy (Nginx, Render, Heroku vb. arkasında gerçek IP'yi almak için)
app.set("trust proxy", 1);

// Görünüm motoru ayarı
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Statik dosyalar (CSS, Resimler) için yol tanımı
app.use(express.static("public"));

// Form ve JSON isteklerini okuyabilmek icin
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session middleware
const isProduction = process.env.NODE_ENV === "production";
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 saat
    },
  }),
);

// Rate Limiting - IP başına istek sınırlama
const contactRequestCounts = {};
const loginRequestCounts = {};
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 saat
const LOGIN_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 dakika
const MAX_REQUESTS = 5;
const MAX_LOGIN_REQUESTS = 5;

// Periyodik bellek temizliği (bellek sızıntısını önler)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const ip in contactRequestCounts) {
    contactRequestCounts[ip] = contactRequestCounts[ip].filter(
      (time) => now - time < RATE_LIMIT_WINDOW,
    );
    if (contactRequestCounts[ip].length === 0) delete contactRequestCounts[ip];
  }
  for (const ip in loginRequestCounts) {
    loginRequestCounts[ip] = loginRequestCounts[ip].filter(
      (time) => now - time < LOGIN_RATE_LIMIT_WINDOW,
    );
    if (loginRequestCounts[ip].length === 0) delete loginRequestCounts[ip];
  }
}, 30 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  // POST /contact veya /iletisim için rate limit
  if (req.method === "POST" && (req.path === "/contact" || req.path === "/iletisim")) {
    if (!contactRequestCounts[ip]) {
      contactRequestCounts[ip] = [];
    }
    contactRequestCounts[ip] = contactRequestCounts[ip].filter(
      (time) => now - time < RATE_LIMIT_WINDOW,
    );
    if (contactRequestCounts[ip].length >= MAX_REQUESTS) {
      const wantsJson = req.accepts(["html", "json"]) === "json";
      if (wantsJson) {
        return res.status(429).json({
          ok: false,
          error:
            "Çok fazla istek gönderdiniz. Lütfen 1 saat sonra tekrar deneyin.",
        });
      }
      return res
        .status(429)
        .send(
          "Çok fazla istek gönderdiniz. Lütfen 1 saat sonra tekrar deneyin.",
        );
    }
    contactRequestCounts[ip].push(now);
  }

  // POST /login için rate limit (Brute-force koruması)
  if (req.method === "POST" && req.path === "/login") {
    if (!loginRequestCounts[ip]) {
      loginRequestCounts[ip] = [];
    }
    loginRequestCounts[ip] = loginRequestCounts[ip].filter(
      (time) => now - time < LOGIN_RATE_LIMIT_WINDOW,
    );
    if (loginRequestCounts[ip].length >= MAX_LOGIN_REQUESTS) {
      return res.redirect(
        "/login?error=Cok%20fazla%20deneme%20yaptiniz.%20Lutfen%2015%20dakika%20bekleyin.",
      );
    }
    loginRequestCounts[ip].push(now);
  }

  next();
});

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Rotaları kullan
app.use("/", indexRoute);

// 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).send("Sayfa bulunamadı - 404");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Sunucu hatası:", err);
  res.status(500).send("Sunucu hatası oluştu.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu aktif: http://localhost:${PORT}`);
});
