require("dotenv").config();
const express = require("express");
const app = express();
const indexRoute = require("./routes/index");

// Görünüm motoru ayarı
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Statik dosyalar (CSS, Resimler) için yol tanımı
// Senin klasör adın 'Public' olduğu için buraya dikkat!
app.use(express.static("public"));

// Form ve JSON isteklerini okuyabilmek icin
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Rate Limiting - IP başına istek sınırlama
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 saat
const MAX_REQUESTS = 5; // Saatte maksimum 5 istek

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts[ip]) {
    requestCounts[ip] = [];
  }

  // Eski istekleri temizle
  requestCounts[ip] = requestCounts[ip].filter(
    (time) => now - time < RATE_LIMIT_WINDOW,
  );

  // POST /contact için rate limit
  if (req.method === "POST" && req.path === "/contact") {
    if (requestCounts[ip].length >= MAX_REQUESTS) {
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
    requestCounts[ip].push(now);
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
  res.status(404).send("Not Found");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Sunucu aktif: http://localhost:${PORT}`);
});
