const dataService = require("../services/dataService");

exports.getHomePage = async (req, res) => {
  try {
    const siteData = await dataService.getSiteData();
    res.render("index", {
      pageTitle: `${siteData.profile.name} | Portfolyo`,
      activePage: "home",
      profile: siteData.profile,
    });
  } catch (error) {
    console.error("Home page error:", error);
    res.status(500).send("Sayfa yüklenirken hata oluştu.");
  }
};
