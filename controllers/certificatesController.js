const dataService = require("../services/dataService");

exports.getCertificatesPage = async (req, res) => {
  try {
    const siteData = await dataService.getSiteData();
    res.render("certificates", {
      pageTitle: `Sertifikalarım | ${siteData.profile.name}`,
      activePage: "certificates",
      certificates: siteData.certificates || [],
    });
  } catch (error) {
    console.error("Certificates page error:", error);
    res.status(500).send("Sayfa yüklenirken hata oluştu.");
  }
};
