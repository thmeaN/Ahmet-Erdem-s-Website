const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const nodemailer = require("nodemailer");

const CONTACTS_PATH = path.join(__dirname, "..", "data", "contacts.jsonl");

let cachedTransport = null;

const getTransport = () => {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";

  if (!host || !port || !user || !pass) {
    return null;
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransport;
};

const escapeHtml = (str) => {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

exports.getContactPage = (req, res) => {
  res.render("contact", {
    pageTitle: "İletişim | Ahmet Erdem Öztürk",
    activePage: "contact",
  });
};

exports.submitContactForm = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const message = String(req.body.message || "").trim();

  const errors = [];
  if (!name) errors.push("İsim zorunludur.");
  if (!email) errors.push("E-posta zorunludur.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Geçerli bir e-posta giriniz.");
  }
  if (!message) errors.push("Mesaj zorunludur.");
  if (message.length > 2000) errors.push("Mesaj 2000 karakteri aşmamalıdır.");

  const wantsJson = req.accepts(["html", "json"]) === "json";
  if (errors.length > 0) {
    if (wantsJson) {
      return res.status(400).json({ ok: false, errors });
    }
    return res.status(400).send(errors.join(" "));
  }

  try {
    await fs.mkdir(path.dirname(CONTACTS_PATH), { recursive: true });
    const payload = {
      id: randomUUID(),
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
    };
    await fs.appendFile(CONTACTS_PATH, `${JSON.stringify(payload)}\n`, "utf8");

    const transport = getTransport();
    if (!transport) {
      if (wantsJson) {
        return res
          .status(500)
          .json({ ok: false, error: "Sunucu e-posta ayarı eksik" });
      }
      return res.status(500).send("Sunucu e-posta ayarı eksik.");
    }

    const toAddress = process.env.MAIL_TO || process.env.SMTP_USER;
    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
    const encodedSubject = encodeURIComponent(`Re: ${name}`);

    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 1.8rem; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 0.95rem; }
          .content { padding: 30px; }
          .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
          .value { color: #333; word-break: break-word; }
          .message-box { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-top: 20px; line-height: 1.6; }
          .message-box h3 { margin: 0 0 15px 0; color: #333; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd; font-size: 0.85rem; color: #666; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📨 Yeni İletişim Mesajı</h1>
            <p>Portfolyo sitenizden yeni bir mesaj aldınız</p>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="label">👤 Gönderici:</div>
              <div class="value">${safeName}</div>
            </div>
            <div class="info-box">
              <div class="label">✉️ E-posta:</div>
              <div class="value"><a href="mailto:${safeEmail}" style="color: #667eea; text-decoration: none;">${safeEmail}</a></div>
            </div>
            <div class="message-box">
              <h3>📝 Mesaj:</h3>
              ${safeMessage}
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="mailto:${safeEmail}?subject=${encodedSubject}" class="button">Cevapla</a>
            </div>
          </div>
          <div class="footer">
            <p>Bu mesaj Ahmet Erdem Öztürk'ün kişisel web sitesinden iletilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transport.sendMail({
      to: toAddress,
      from: `Web İletişim <${fromAddress}>`,
      replyTo: email,
      subject: `Yeni iletişim mesajı - ${name}`,
      html: htmlTemplate,
      text: `Ad: ${name}\nE-posta: ${email}\n\nMesaj:\n${message}`,
    });

    if (wantsJson) {
      return res.status(200).json({ ok: true });
    }
    return res.status(200).send("Mesajınız alındı. Teşekkürler!");
  } catch (error) {
    console.error("İletişim formu gönderme hatası:", error);
    if (wantsJson) {
      return res.status(500).json({ ok: false, error: "Sunucu hatası" });
    }
    return res.status(500).send("Sunucu hatası. Lütfen tekrar deneyiniz.");
  }
};
