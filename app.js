const express = require("express");
const app = express();
const indexRoute = require("./routes/index");

// Görünüm motoru ayarı
app.set("view engine", "ejs");

// Statik dosyalar (CSS, Resimler) için yol tanımı
// Senin klasör adın 'Public' olduğu için buraya dikkat!
app.use(express.static("public"));

// Rotaları kullan
app.use("/", indexRoute);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Sunucu aktif: http://localhost:${PORT}`);
});
