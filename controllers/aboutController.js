const dataService = require("../services/dataService");

exports.getAboutPage = async (req, res) => {
  try {
    const siteData = await dataService.getSiteData();
    res.render("about", {
      pageTitle: `${siteData.about.title} | ${siteData.profile.name}`,
      activePage: "about",
      about: siteData.about,
      profile: siteData.profile,
    });
  } catch (error) {
    console.error("About page error:", error);
    res.status(500).send("Sayfa yüklenirken hata oluştu.");
  }
};
