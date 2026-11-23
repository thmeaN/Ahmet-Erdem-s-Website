const { timingSafeEqual } = require("crypto");

exports.getLoginPage = (req, res) => {
  res.render("login", { error: req.query.error || "" });
};

exports.submitLogin = (req, res) => {
  const password = String(req.body.password || "").trim();
  const correctPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      "GÜVENLİK UYARISI: ADMIN_PASSWORD ortam değişkeni ayarlanmamış, varsayılan şifre devrede!",
    );
  }

  const passwordBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(correctPassword);
  const isMatch =
    passwordBuffer.length === expectedBuffer.length &&
    timingSafeEqual(passwordBuffer, expectedBuffer);

  if (isMatch) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  res.redirect("/login?error=Yanlis%20sifre");
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/");
  });
};
