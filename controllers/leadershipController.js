const dataService = require("../services/dataService");

exports.getLeadershipPage = async (req, res) => {
  try {
    const siteData = await dataService.getSiteData();
    res.render("leadership", {
      pageTitle: `${siteData.leadership.roleTitle} | ${siteData.profile.name}`,
      activePage: "leadership",
      leadership: siteData.leadership,
    });
  } catch (error) {
    console.error("Leadership page error:", error);
    res.status(500).send("Sayfa yüklenirken hata oluştu.");
  }
};
