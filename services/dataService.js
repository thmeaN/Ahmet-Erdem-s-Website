const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");

const DATA_FILE_PATH = path.join(__dirname, "..", "data", "siteData.json");

let memoryCache = null;

/**
 * Get all site data with fallback
 */
async function getSiteData() {
  try {
    const raw = await fs.readFile(DATA_FILE_PATH, "utf8");
    memoryCache = JSON.parse(raw);
    return memoryCache;
  } catch (error) {
    if (memoryCache) return memoryCache;
    throw error;
  }
}

/**
 * Save site data atomically
 */
async function saveSiteData(newData) {
  memoryCache = newData;
  await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(newData, null, 2), "utf8");
  return memoryCache;
}

/**
 * Get specific section
 */
async function getSection(sectionName) {
  const data = await getSiteData();
  return data[sectionName] || null;
}

/**
 * Update specific section
 */
async function updateSection(sectionName, sectionData) {
  const allData = await getSiteData();
  allData[sectionName] = sectionData;
  await saveSiteData(allData);
  return allData[sectionName];
}

/**
 * Projects CRUD
 */
async function addProject(projectPayload) {
  const allData = await getSiteData();
  const newProject = {
    id: projectPayload.id || `proj-${randomUUID()}`,
    name: projectPayload.name || "Yeni Proje",
    tagline: projectPayload.tagline || "",
    featuredBadge: projectPayload.featuredBadge || "",
    tags: Array.isArray(projectPayload.tags) ? projectPayload.tags : [],
    problemSolution: projectPayload.problemSolution || "",
    role: projectPayload.role || "",
    roleDescription: projectPayload.roleDescription || "",
    techStack: Array.isArray(projectPayload.techStack) ? projectPayload.techStack : [],
    githubUrl: projectPayload.githubUrl || "",
    liveUrl: projectPayload.liveUrl || "",
    imageUrl: projectPayload.imageUrl || "",
  };
  allData.projects = allData.projects || [];
  allData.projects.unshift(newProject);
  await saveSiteData(allData);
  return newProject;
}

async function updateProject(id, projectPayload) {
  const allData = await getSiteData();
  const index = (allData.projects || []).findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error("Proje bulunamadı");
  }
  allData.projects[index] = {
    ...allData.projects[index],
    ...projectPayload,
    id, // protect id
  };
  await saveSiteData(allData);
  return allData.projects[index];
}

async function deleteProject(id) {
  const allData = await getSiteData();
  allData.projects = (allData.projects || []).filter((p) => p.id !== id);
  await saveSiteData(allData);
  return true;
}

/**
 * Certificates CRUD
 */
async function addCertificate(certPayload) {
  const allData = await getSiteData();
  const newCert = {
    id: certPayload.id || `cert-${randomUUID()}`,
    title: certPayload.title || "Yeni Sertifika",
    issuer: certPayload.issuer || "",
    description: certPayload.description || "",
    imageUrl: certPayload.imageUrl || "/Pictures/sertifika1.jpg",
    verifyUrl: certPayload.verifyUrl || "",
  };
  allData.certificates = allData.certificates || [];
  allData.certificates.unshift(newCert);
  await saveSiteData(allData);
  return newCert;
}

async function updateCertificate(id, certPayload) {
  const allData = await getSiteData();
  const index = (allData.certificates || []).findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error("Sertifika bulunamadı");
  }
  allData.certificates[index] = {
    ...allData.certificates[index],
    ...certPayload,
    id, // protect id
  };
  await saveSiteData(allData);
  return allData.certificates[index];
}

async function deleteCertificate(id) {
  const allData = await getSiteData();
  allData.certificates = (allData.certificates || []).filter((c) => c.id !== id);
  await saveSiteData(allData);
  return true;
}

module.exports = {
  getSiteData,
  saveSiteData,
  getSection,
  updateSection,
  addProject,
  updateProject,
  deleteProject,
  addCertificate,
  updateCertificate,
  deleteCertificate,
};
