/**
 * Theme Switcher (Dark / Light Mode)
 * Persists user preference in localStorage
 */
document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("themeToggleBtn");
  if (!toggleBtn) return;

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}

    // Update accessible labels
    if (theme === "dark") {
      toggleBtn.setAttribute("title", "Açık Temaya Geç");
      toggleBtn.setAttribute("aria-label", "Açık Temaya Geç");
    } else {
      toggleBtn.setAttribute("title", "Karanlık Temaya Geç");
      toggleBtn.setAttribute("aria-label", "Karanlık Temaya Geç");
    }
  }

  // Set initial tooltip/label
  applyTheme(getCurrentTheme());

  toggleBtn.addEventListener("click", function () {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
});
