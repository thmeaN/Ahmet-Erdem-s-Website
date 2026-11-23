const dataService = require("../services/dataService");

exports.getProjectsPage = async (req, res) => {
  try {
    const siteData = await dataService.getSiteData();
    res.render("projects", {
      pageTitle: `Projelerim | ${siteData.profile.name}`,
      activePage: "projects",
      projects: siteData.projects || [],
    });
  } catch (error) {
    console.error("Projects page error:", error);
    res.status(500).send("Sayfa yüklenirken hata oluştu.");
  }
};
