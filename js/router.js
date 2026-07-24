import {
  getLatestJobs,
  getCompanies,
  getCompanyById,
  getCategoryStats,
  getHiringStats,
  formatSalary,
  formatExperience,
  formatDate
} from "./jobs.js";
import { getSavedJobIds, getSavedJobs, isJobSaved } from "./storage.js";
import {
  getInitialFilters,
  renderFilterPanel,
  renderSortSelect,
  setupRealtimeFilters,
  applyFilters,
  summarizeFilters
} from "./filters.js";
import { fetchJobs, getActiveJobs, getActiveJobById, hasLiveJobProvider } from "./api.js";
import { fetchHiringNews } from "./news.js";
import { initJobsMap } from "./map.js";
import { animateCounters, initDashboardCharts } from "./charts.js";
import { setupApplyForm, setupContactForm } from "./apply.js";

const app = document.getElementById("app");
let currentFeed = null;
let currentNewsFeed = null;

const routeMeta = {
  home: {
    title: "CareerConnect | Live Job Portal & Recruitment Dashboard",
    description: "CareerConnect is a production-ready recruitment platform with live jobs, maps, dashboards, saved roles, hiring news, and local fallback data."
  },
  jobs: {
    title: "Live Jobs | CareerConnect",
    description: "Search live and fallback job listings by keyword, location, company, experience, salary, job type, and work model."
  },
  companies: {
    title: "Company Profiles | CareerConnect",
    description: "Explore hiring companies with profiles, websites, locations, open job counts, and map-ready offices."
  },
  saved: {
    title: "Saved Jobs | CareerConnect",
    description: "Review saved jobs stored in your browser and apply directly through employer links."
  },
  news: {
    title: "Hiring News | CareerConnect",
    description: "Read the latest recruitment, technology, hiring, and workplace news from CareerConnect."
  },
  apply: {
    title: "Apply | CareerConnect",
    description: "Submit a validated front-end job application through CareerConnect."
  },
  about: {
    title: "About | CareerConnect",
    description: "Learn about CareerConnect's mission to make recruitment clearer, faster, and more useful."
  },
  contact: {
    title: "Contact | CareerConnect",
    description: "Contact CareerConnect for candidate support, employer partnerships, and recruitment platform questions."
  }
};

const iconPaths = {
  search: '<path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="7"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  briefcase: '<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 13h18"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 8h2a2 2 0 0 1 2 2v11"/><path d="M9 7h2M9 11h2M9 15h2M3 21h18"/>',
  map: '<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  wallet: '<path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13"/><path d="M16 13h5"/><path d="M18 13h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bookmark: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/>',
  send: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3Z"/>',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="m22 6-10 7L2 6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>',
  news: '<path d="M4 19a2 2 0 0 0 2 2h13"/><path d="M4 5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v16"/><path d="M8 7h7M8 11h7M8 15h5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  spark: '<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"/>'
};

export function icon(name, className = "icon") {
  const path = iconPaths[name] || iconPaths.briefcase;
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${path}</svg>`;
}

function filledBookmark(className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/></svg>`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseHash() {
  const rawHash = window.location.hash.replace(/^#\/?/, "") || "home";
  const [path = "home", query = ""] = rawHash.split("?");
  return {
    route: path.toLowerCase() || "home",
    params: new URLSearchParams(query)
  };
}

function notify(message) {
  window.dispatchEvent(new CustomEvent("careerconnect:notify", { detail: { message } }));
}

function updateMeta(meta) {
  document.title = meta.title;
  [
    ['meta[name="description"]', "description"],
    ['meta[property="og:title"]', "title"],
    ['meta[property="og:description"]', "description"],
    ['meta[name="twitter:title"]', "title"],
    ['meta[name="twitter:description"]', "description"]
  ].forEach(([selector, key]) => {
    const element = document.querySelector(selector);
    if (element) {
      element.setAttribute("content", meta[key]);
    }
  });
}

function setActiveNav(route) {
  const activeRoute = route === "job" ? "jobs" : route === "company" ? "companies" : route;
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const isActive = link.dataset.navLink === activeRoute;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function sectionHeader(kicker, title, description, actions = "") {
  return `
    <div class="section-header">
      <p class="eyebrow">${escapeHTML(kicker)}</p>
      <div>
        <h2>${escapeHTML(title)}</h2>
        <p>${escapeHTML(description)}</p>
      </div>
      ${actions}
    </div>
  `;
}

function loadingTemplate() {
  return `
    <section class="section-shell loading-view" aria-label="Loading">
      <div class="skeleton-grid">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
      <p>Loading CareerConnect</p>
    </section>
  `;
}

function errorTemplate(message) {
  return `
    <section class="section-shell">
      <div class="empty-state">
        <h1>Something went wrong</h1>
        <p>${escapeHTML(message)}</p>
        <a class="btn btn-primary" href="#home">${icon("arrow")}Return home</a>
      </div>
    </section>
  `;
}

function badgeList(items = []) {
  return items.map((item) => `<span class="badge">${escapeHTML(item)}</span>`).join("");
}

function detailList(items = []) {
  return items.map((item) => `<li>${escapeHTML(item)}</li>`).join("");
}

function todayCount(jobs) {
  const today = new Date().toISOString().slice(0, 10);
  return jobs.filter((job) => job.postedDate === today).length;
}

function dashboardCards(jobs) {
  const stats = getHiringStats(jobs);
  return `
    <div class="dashboard-grid" aria-label="Trending jobs dashboard">
      <article class="dashboard-card">
        <span>${icon("briefcase")}</span>
        <strong data-counter="${stats.jobs}">0</strong>
        <p>Total Jobs</p>
      </article>
      <article class="dashboard-card">
        <span>${icon("globe")}</span>
        <strong data-counter="${stats.remoteJobs}">0</strong>
        <p>Remote Jobs</p>
      </article>
      <article class="dashboard-card">
        <span>${icon("building")}</span>
        <strong data-counter="${stats.companies}">0</strong>
        <p>Companies Hiring</p>
      </article>
      <article class="dashboard-card">
        <span>${icon("spark")}</span>
        <strong data-counter="${todayCount(jobs)}">0</strong>
        <p>New Jobs Today</p>
      </article>
    </div>
  `;
}

function dashboardCharts() {
  return `
    <div class="charts-grid">
      <article class="chart-card">
        <h3>Most Popular Categories</h3>
        <div class="chart-frame"><canvas data-category-chart aria-label="Most popular job categories chart"></canvas></div>
      </article>
      <article class="chart-card">
        <h3>Work Model Mix</h3>
        <div class="chart-frame"><canvas data-workplace-chart aria-label="Remote hybrid and on-site chart"></canvas></div>
      </article>
    </div>
  `;
}

function sourceBanner(feed) {
  const label = feed.source === "local" ? "Local fallback active" : `Live ${feed.source} feed`;
  return `
    <div class="source-banner${feed.isFallback ? " is-fallback" : ""}">
      <span>${icon(feed.isFallback ? "shield" : "spark")}</span>
      <div>
        <strong>${escapeHTML(label)}</strong>
        <p>${escapeHTML(feed.message)}</p>
      </div>
    </div>
  `;
}

export function jobCard(job, options = {}) {
  const saved = isJobSaved(job.id);
  const saveLabel = saved ? "Remove saved job" : "Save job";
  const saveIcon = saved ? filledBookmark() : icon("bookmark");
  const applyHref = job.applicationLink || `#apply?job=${encodeURIComponent(job.id)}`;
  const external = /^https?:\/\//.test(applyHref);

  return `
    <article class="job-card fade-in" data-job-card="${escapeHTML(job.id)}">
      <div class="job-card-top">
        <a class="logo-box" href="#company?id=${encodeURIComponent(job.companyId)}" aria-label="View ${escapeHTML(job.company)}">
          <img src="${escapeHTML(job.companyLogo)}" alt="${escapeHTML(job.company)} logo" width="56" height="56" loading="lazy" decoding="async">
        </a>
        <div>
          <p class="job-company">${escapeHTML(job.company)}</p>
          <h3><a href="#job?id=${encodeURIComponent(job.id)}">${escapeHTML(job.title)}</a></h3>
        </div>
        <button class="icon-button save-action${saved ? " is-saved" : ""}" type="button" data-save-job="${escapeHTML(job.id)}" aria-label="${saveLabel}" title="${saveLabel}">
          ${saveIcon}
        </button>
      </div>

      <div class="job-meta-grid">
        <span>${icon("map")} ${escapeHTML(job.location)}</span>
        <span>${icon("wallet")} ${escapeHTML(formatSalary(job))}</span>
        <span>${icon("briefcase")} ${escapeHTML(formatExperience(job))}</span>
        <span>${icon("clock")} Posted ${escapeHTML(formatDate(job.postedDate))}</span>
      </div>

      <div class="job-tags">
        <span>${escapeHTML(job.jobType || job.employmentType)}</span>
        <span>${escapeHTML(job.workplace)}</span>
        <span>${escapeHTML(job.category)}</span>
      </div>

      <p class="job-summary">${escapeHTML(job.description)}</p>

      <div class="card-actions">
        <a class="btn btn-primary btn-small" href="${escapeHTML(applyHref)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${icon("send")}Apply</a>
        <a class="btn btn-secondary btn-small" href="#job?id=${encodeURIComponent(job.id)}">Details</a>
        ${options.savedPage ? `<button class="btn btn-ghost btn-small" type="button" data-remove-saved="${escapeHTML(job.id)}">Remove</button>` : ""}
      </div>
    </article>
  `;
}

function companyCard(company) {
  return `
    <article class="company-card fade-in">
      <div class="company-card-head">
        <img src="${escapeHTML(company.logo)}" alt="${escapeHTML(company.name)} logo" width="64" height="64" loading="lazy" decoding="async">
        <div>
          <h3>${escapeHTML(company.name)}</h3>
          <p>${escapeHTML(company.industry || "Hiring company")}</p>
        </div>
      </div>
      <p>${escapeHTML(company.description)}</p>
      <div class="company-facts">
        <span>${icon("map")} ${escapeHTML(company.location)}</span>
        <span>${icon("users")} ${escapeHTML(company.size || "Hiring team")}</span>
        <span>${icon("briefcase")} ${company.openJobs} open ${company.openJobs === 1 ? "job" : "jobs"}</span>
      </div>
      <div class="job-tags">${badgeList(company.categories.slice(0, 3))}</div>
      <div class="card-actions">
        <a class="btn btn-secondary btn-small" href="#company?id=${encodeURIComponent(company.id)}">Profile ${icon("arrow")}</a>
        <a class="btn btn-ghost btn-small" href="${escapeHTML(company.website || "#jobs")}" target="_blank" rel="noopener noreferrer">Website</a>
      </div>
    </article>
  `;
}

function newsCard(article) {
  return `
    <article class="news-card fade-in">
      <img src="${escapeHTML(article.image)}" alt="" width="420" height="220" loading="lazy" decoding="async">
      <div>
        <p class="eyebrow">${escapeHTML(article.category)} - ${escapeHTML(article.source)}</p>
        <h3><a href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(article.title)}</a></h3>
        <p>${escapeHTML(article.description)}</p>
        <span>${escapeHTML(formatDate(article.publishedAt.slice(0, 10)))}</span>
      </div>
    </article>
  `;
}

async function loadJobFeed(filters = {}, force = false) {
  const hasFilters = Object.values(filters).some(Boolean);
  if (currentFeed && !force && !hasFilters) {
    return currentFeed;
  }

  const feed = await fetchJobs(filters);
  currentFeed = feed;
  if (feed.notify !== false) {
    notify(feed.message);
  }
  return feed;
}

async function loadNewsFeed(force = false) {
  if (currentNewsFeed && !force) {
    return currentNewsFeed;
  }
  currentNewsFeed = await fetchHiringNews();
  if (currentNewsFeed.notify !== false) {
    notify(currentNewsFeed.message);
  }
  return currentNewsFeed;
}

function homeTemplate(feed, newsFeed) {
  const jobs = feed.jobs;
  const companies = getCompanies(jobs).slice(0, 6);
  const categories = getCategoryStats(jobs).slice(0, 8);
  const latestJobs = getLatestJobs(jobs, 6);
  const news = newsFeed.articles.slice(0, 3);

  return `
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">Live recruitment intelligence</p>
        <h1>CareerConnect</h1>
        <p class="hero-lede">A modern recruitment platform with live job search, hiring dashboards, company maps, saved roles, external applications, and resilient local fallback data.</p>
        <form class="hero-search glass-panel" data-home-search aria-label="Search jobs">
          <label class="sr-only" for="home-search">Search jobs</label>
          <input id="home-search" type="search" name="keyword" placeholder="Search title, company, skill, or location" autocomplete="off">
          <button class="btn btn-primary" type="submit">${icon("search")}Search jobs</button>
        </form>
        <div class="hero-actions">
          <a class="btn btn-secondary" href="#jobs">${icon("briefcase")}Browse jobs</a>
          <a class="btn btn-ghost" href="#news">${icon("news")}Hiring news</a>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <img src="assets/images/hero-recruitment.svg" alt="" width="980" height="720" decoding="async">
      </div>
    </section>

    <section class="section-shell dashboard-section">
      ${sourceBanner(feed)}
      ${dashboardCards(jobs)}
      ${dashboardCharts()}
    </section>

    <section class="section-shell">
      ${sectionHeader("Featured companies", "Employers hiring now", "Explore hiring teams with profiles, websites, open role counts, and mapped locations.", `<a class="text-link" href="#companies">View all ${icon("arrow")}</a>`)}
      <div class="company-grid compact-grid">${companies.map(companyCard).join("")}</div>
    </section>

    <section class="section-shell">
      ${sectionHeader("Popular categories", "Trending job categories", "Role categories are calculated from the active job feed.")}
      <div class="category-grid">
        ${categories.map((category, index) => `
          <a class="category-card" href="#jobs?keyword=${encodeURIComponent(category.name)}">
            <span class="category-icon">${icon(index % 3 === 0 ? "chart" : index % 3 === 1 ? "briefcase" : "shield")}</span>
            <strong>${escapeHTML(category.name)}</strong>
            <span>${category.count} open ${category.count === 1 ? "role" : "roles"}</span>
          </a>
        `).join("")}
      </div>
    </section>

    <section class="section-shell">
      ${sectionHeader("Latest jobs", "Fresh opportunities", "Recently posted roles with company, salary, work model, map location, and direct application links.", `<a class="text-link" href="#jobs">Browse all ${icon("arrow")}</a>`)}
      <div class="job-grid">${latestJobs.map((job) => jobCard(job)).join("")}</div>
    </section>

    <section class="section-shell">
      ${sectionHeader("Hiring news", "Recruitment and technology updates", "Latest hiring news from the live news provider or local fallback feed.", `<a class="text-link" href="#news">Read more ${icon("arrow")}</a>`)}
      <div class="news-grid">${news.map(newsCard).join("")}</div>
    </section>
  `;
}

function jobsTemplate(feed, params) {
  const filters = getInitialFilters(params);
  const filteredJobs = applyFilters(feed.jobs, filters);

  return `
    <section class="section-shell page-intro">
      <p class="eyebrow">Live job search</p>
      <h1>Search jobs in real time</h1>
      <p>Search by keyword, location, company, experience, salary, job type, and remote, hybrid, or on-site model.</p>
    </section>

    <section class="section-shell jobs-dashboard">
      ${sourceBanner(feed)}
      ${dashboardCards(feed.jobs)}
      <div class="job-map-panel">
        <div>
          <p class="eyebrow">Company locations</p>
          <h2>Interactive job map</h2>
          <p>Click a marker to preview a job and open its details.</p>
        </div>
        <div id="jobs-map" class="jobs-map" role="application" aria-label="Map of job locations"></div>
      </div>
    </section>

    <section class="section-shell jobs-layout">
      <aside class="filters-wrap" aria-label="Job filters">
        ${renderFilterPanel(feed.jobs, filters, feed)}
      </aside>
      <div class="results-area">
        <div class="results-toolbar">
          <div>
            <p class="eyebrow" data-jobs-count>${filteredJobs.length} jobs found</p>
            <h2 data-jobs-summary>${escapeHTML(summarizeFilters(filters))}</h2>
          </div>
          ${renderSortSelect(filters)}
        </div>
        <div class="job-list" data-jobs-results>${filteredJobs.map((job) => jobCard(job)).join("")}</div>
      </div>
    </section>
  `;
}

function renderJobResults(root, jobs, filters) {
  const results = root.querySelector("[data-jobs-results]");
  const count = root.querySelector("[data-jobs-count]");
  const summary = root.querySelector("[data-jobs-summary]");
  if (!results || !count || !summary) {
    return;
  }

  results.innerHTML = jobs.length
    ? jobs.map((job) => jobCard(job)).join("")
    : `
      <div class="empty-state">
        <h2>No jobs match this search</h2>
        <p>Try a broader keyword, location, salary, or work model.</p>
        <button class="btn btn-primary" type="button" data-clear-filters>Reset filters</button>
      </div>
    `;
  count.textContent = `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} found`;
  summary.textContent = summarizeFilters(filters);
  initJobsMap("#jobs-map", jobs);
}

function setupJobsRoute(root, feed) {
  let activeJobs = [...feed.jobs];
  const initialFilters = getInitialFilters(parseHash().params);
  const initial = applyFilters(activeJobs, initialFilters);
  renderJobResults(root, initial, initialFilters);
  animateCounters(root);

  setupRealtimeFilters({
    root,
    getJobs: () => activeJobs,
    canUseLiveProvider: hasLiveJobProvider(),
    renderResults: (jobs, filters) => renderJobResults(root, jobs, filters),
    onRemoteSearch: async (filters) => {
      const results = root.querySelector("[data-jobs-results]");
      if (results) {
        results.innerHTML = '<div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>';
      }
      const nextFeed = await loadJobFeed(filters, true);
      activeJobs = [...nextFeed.jobs];
      const filtered = applyFilters(activeJobs, filters);
      renderJobResults(root, filtered, filters);
    }
  });
}

function jobDetailTemplate(job) {
  const saved = isJobSaved(job.id);
  const applyHref = job.applicationLink || "#jobs";
  return `
    <section class="section-shell detail-header">
      <a class="text-link" href="#jobs">${icon("arrow")}Back to jobs</a>
      <div class="detail-hero">
        <div class="detail-title">
          <img src="${escapeHTML(job.companyLogo)}" alt="${escapeHTML(job.company)} logo" width="76" height="76" loading="lazy" decoding="async">
          <div>
            <p class="eyebrow">${escapeHTML(job.company)} - ${escapeHTML(job.category)}</p>
            <h1>${escapeHTML(job.title)}</h1>
            <p>${escapeHTML(job.description)}</p>
          </div>
        </div>
        <div class="detail-actions">
          <a class="btn btn-primary" href="${escapeHTML(applyHref)}" target="_blank" rel="noopener noreferrer">${icon("send")}Apply on employer site</a>
          <button class="btn btn-secondary" type="button" data-save-job="${escapeHTML(job.id)}" aria-label="${saved ? "Remove saved job" : "Save job"}">
            ${saved ? filledBookmark() : icon("bookmark")}${saved ? "Saved" : "Save job"}
          </button>
        </div>
      </div>
    </section>

    <section class="section-shell detail-layout">
      <article class="detail-main">
        <h2>Role overview</h2>
        <p>${escapeHTML(job.description)}</p>
        <h2>Responsibilities</h2>
        <ul class="check-list">${detailList(job.responsibilities)}</ul>
        <h2>Requirements</h2>
        <ul class="check-list">${detailList(job.requirements)}</ul>
        <h2>Skills</h2>
        <div class="skill-cloud">${badgeList(job.skills)}</div>
        <h2>Benefits</h2>
        <ul class="check-list">${detailList(job.benefits)}</ul>
      </article>

      <aside class="detail-sidebar" aria-label="Job summary">
        <div class="summary-card">
          <h2>Job summary</h2>
          <dl>
            <div><dt>Salary</dt><dd>${escapeHTML(formatSalary(job))}</dd></div>
            <div><dt>Location</dt><dd>${escapeHTML(job.location)}</dd></div>
            <div><dt>Experience</dt><dd>${escapeHTML(formatExperience(job))}</dd></div>
            <div><dt>Job Type</dt><dd>${escapeHTML(job.jobType || job.employmentType)}</dd></div>
            <div><dt>Work model</dt><dd>${escapeHTML(job.workplace)}</dd></div>
            <div><dt>Posted</dt><dd>${escapeHTML(formatDate(job.postedDate))}</dd></div>
          </dl>
        </div>
        <div class="summary-card">
          <h2>Company</h2>
          <p>${escapeHTML(job.companyDescription)}</p>
          <a class="text-link" href="#company?id=${encodeURIComponent(job.companyId)}">View company ${icon("arrow")}</a>
        </div>
      </aside>
    </section>
  `;
}

function savedTemplate(allJobs) {
  const savedIds = getSavedJobIds();
  const savedSnapshots = getSavedJobs();
  const savedJobs = savedIds
    .map((id) => allJobs.find((job) => job.id === id) || savedSnapshots.find((job) => job.id === id))
    .filter(Boolean);

  return `
    <section class="section-shell page-intro">
      <p class="eyebrow">Saved Jobs</p>
      <h1>Your recruitment shortlist</h1>
      <p>Saved jobs are stored locally in this browser, including live API listings, so your shortlist survives route changes.</p>
    </section>
    <section class="section-shell">
      ${savedJobs.length ? `
        <div class="results-toolbar simple-toolbar">
          <div>
            <p class="eyebrow">${savedJobs.length} saved ${savedJobs.length === 1 ? "job" : "jobs"}</p>
            <h2>Apply directly through employer links</h2>
          </div>
          <a class="btn btn-secondary" href="#jobs">${icon("search")}Find more jobs</a>
        </div>
        <div class="job-grid">${savedJobs.map((job) => jobCard(job, { savedPage: true })).join("")}</div>
      ` : `
        <div class="empty-state">
          <h2>No saved jobs yet</h2>
          <p>Save roles from the live jobs page and they will appear here.</p>
          <a class="btn btn-primary" href="#jobs">${icon("briefcase")}Browse jobs</a>
        </div>
      `}
    </section>
  `;
}

function companiesTemplate(jobs) {
  const companies = getCompanies(jobs);
  return `
    <section class="section-shell page-intro">
      <p class="eyebrow">Company profiles</p>
      <h1>Explore hiring companies</h1>
      <p>Profiles include logo, industry, website, location, open jobs, and a map-ready office signal.</p>
    </section>
    <section class="section-shell company-map-section">
      <div class="job-map-panel">
        <div>
          <p class="eyebrow">Hiring map</p>
          <h2>Company locations</h2>
          <p>Markers open representative job details for each company.</p>
        </div>
        <div id="companies-map" class="jobs-map" role="application" aria-label="Map of company locations"></div>
      </div>
    </section>
    <section class="section-shell">
      <div class="company-grid">${companies.map(companyCard).join("")}</div>
    </section>
  `;
}

function companyDetailTemplate(company) {
  return `
    <section class="section-shell detail-header">
      <a class="text-link" href="#companies">${icon("arrow")}Back to companies</a>
      <div class="detail-hero company-hero">
        <div class="detail-title">
          <img src="${escapeHTML(company.logo)}" alt="${escapeHTML(company.name)} logo" width="84" height="84" loading="lazy" decoding="async">
          <div>
            <p class="eyebrow">${escapeHTML(company.industry || "Hiring company")}</p>
            <h1>${escapeHTML(company.name)}</h1>
            <p>${escapeHTML(company.description)}</p>
          </div>
        </div>
        <div class="detail-actions">
          <a class="btn btn-primary" href="#jobs?company=${encodeURIComponent(company.name)}">${icon("briefcase")}Open jobs</a>
          <a class="btn btn-secondary" href="${escapeHTML(company.website || "#jobs")}" target="_blank" rel="noopener noreferrer">${icon("globe")}Website</a>
        </div>
      </div>
    </section>

    <section class="section-shell detail-layout">
      <article class="detail-main">
        <h2>Company profile</h2>
        <p>${escapeHTML(company.description)}</p>
        <h2>Hiring focus</h2>
        <div class="skill-cloud">${badgeList(company.categories)}</div>
        <h2>Open jobs</h2>
        <div class="job-list compact-list">${company.jobs.map((job) => jobCard(job)).join("")}</div>
      </article>
      <aside class="detail-sidebar" aria-label="Company summary">
        <div class="summary-card">
          <h2>Company details</h2>
          <dl>
            <div><dt>Industry</dt><dd>${escapeHTML(company.industry || "Hiring")}</dd></div>
            <div><dt>Location</dt><dd>${escapeHTML(company.location)}</dd></div>
            <div><dt>Team size</dt><dd>${escapeHTML(company.size || "Hiring team")}</dd></div>
            <div><dt>Website</dt><dd><a href="${escapeHTML(company.website || "#jobs")}" target="_blank" rel="noopener noreferrer">Open site</a></dd></div>
            <div><dt>Open jobs</dt><dd>${company.openJobs}</dd></div>
          </dl>
        </div>
      </aside>
    </section>
  `;
}

function newsTemplate(newsFeed) {
  return `
    <section class="section-shell page-intro">
      <p class="eyebrow">Live hiring news</p>
      <h1>Recruitment and technology news</h1>
      <p>CareerConnect loads hiring news from GNews when configured and uses local fallback articles when the API is unavailable.</p>
    </section>
    <section class="section-shell">
      ${sourceBanner(newsFeed)}
      <div class="news-grid news-grid-wide">${newsFeed.articles.map(newsCard).join("")}</div>
    </section>
  `;
}

function applyTemplate(job) {
  return `
    <section class="section-shell page-intro">
      <p class="eyebrow">Application</p>
      <h1>Apply with confidence</h1>
      <p>External apply links are available on every job. This internal form remains for demo-friendly front-end validation.</p>
    </section>
    <section class="section-shell application-layout">
      <article class="application-role">
        <img src="${escapeHTML(job?.companyLogo || "assets/logo.png")}" alt="${escapeHTML(job?.company || "CareerConnect")} logo" width="62" height="62" loading="lazy" decoding="async">
        <div>
          <p class="eyebrow">Applying for</p>
          <h2>${escapeHTML(job?.title || "General application")}</h2>
          <p>${escapeHTML(job ? `${job.company} - ${job.location} - ${formatSalary(job)}` : "Share your candidate profile")}</p>
        </div>
      </article>
      <form class="form-card" data-apply-form novalidate>
        <div class="form-grid two-columns">
          <label class="field"><span>Full Name</span><input name="fullName" type="text" autocomplete="name" aria-describedby="apply-fullName-error"><small class="field-error" id="apply-fullName-error"></small></label>
          <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" aria-describedby="apply-email-error"><small class="field-error" id="apply-email-error"></small></label>
          <label class="field"><span>Phone</span><input name="phone" type="tel" autocomplete="tel" aria-describedby="apply-phone-error"><small class="field-error" id="apply-phone-error"></small></label>
          <label class="field"><span>Qualification</span><select name="qualification" aria-describedby="apply-qualification-error"><option value="">Select qualification</option><option>High School Diploma</option><option>Associate Degree</option><option>Bachelor's Degree</option><option>Master's Degree</option><option>Doctorate</option><option>Professional Certification</option></select><small class="field-error" id="apply-qualification-error"></small></label>
          <label class="field"><span>Experience</span><input name="experience" type="number" min="0" max="50" step="1" aria-describedby="apply-experience-error"><small class="field-error" id="apply-experience-error"></small></label>
          <label class="field file-field"><span>Resume upload</span><input name="resume" type="file" accept=".pdf,.doc,.docx" aria-describedby="apply-resume-error apply-resume-name"><span class="file-control">${icon("briefcase")}Choose resume</span><span class="file-name" id="apply-resume-name" data-resume-name>No file selected</span><small class="field-error" id="apply-resume-error"></small></label>
        </div>
        <label class="field"><span>Cover Letter</span><textarea name="coverLetter" rows="7" aria-describedby="apply-coverLetter-error"></textarea><small class="field-error" id="apply-coverLetter-error"></small></label>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${icon("send")}Submit application</button>
          ${job?.applicationLink ? `<a class="btn btn-secondary" href="${escapeHTML(job.applicationLink)}" target="_blank" rel="noopener noreferrer">Apply externally</a>` : ""}
        </div>
        <p class="success-message" data-form-success tabindex="-1" hidden></p>
      </form>
    </section>
  `;
}

function aboutTemplate() {
  return `
    <section class="section-shell page-intro">
      <p class="eyebrow">About CareerConnect</p>
      <h1>Recruitment built for real-world workflows</h1>
      <p>CareerConnect combines live job APIs, fallback data, company maps, dashboards, hiring news, saved jobs, and accessible client-side routing in one static platform.</p>
    </section>
    <section class="section-shell narrative-grid">
      <article><h2>Mission</h2><p>Make recruitment search clearer, faster, and more resilient for candidates and hiring teams.</p></article>
      <article><h2>Vision</h2><p>Give static deployments the feel of a professional jobs marketplace without requiring a backend database.</p></article>
      <article><h2>Why choose us</h2><p>Live integrations gracefully fall back to local data, keeping the demo reliable on Vercel, Netlify, and Render.</p></article>
    </section>
    <section class="section-shell values-section">
      ${sectionHeader("Platform standards", "Professional recruitment features", "CareerConnect is built around dependable data access, clear UI states, and accessible navigation.")}
      <div class="value-grid">
        <article class="value-card"><span>${icon("spark")}</span><h3>Live where possible</h3><p>Adzuna or JSearch can power job results when keys are configured.</p></article>
        <article class="value-card"><span>${icon("shield")}</span><h3>Reliable fallback</h3><p>Local JSON keeps jobs, companies, maps, charts, and saved roles working offline.</p></article>
        <article class="value-card"><span>${icon("check")}</span><h3>Accessible UI</h3><p>Semantic routes, keyboard controls, ARIA feedback, and visible focus states are built in.</p></article>
      </div>
    </section>
  `;
}

function contactTemplate() {
  return `
    <section class="section-shell page-intro">
      <p class="eyebrow">Contact</p>
      <h1>Talk to CareerConnect</h1>
      <p>Reach the team for candidate support, employer partnerships, API setup, or deployment demonstrations.</p>
    </section>
    <section class="section-shell contact-layout">
      <div class="contact-panel">
        <h2>Contact details</h2>
        <p>CareerConnect support is designed around practical hiring questions and fast follow-up.</p>
        <ul class="contact-list">
          <li>${icon("mail")} support@careerconnect.local</li>
          <li>${icon("phone")} +1 212 555 0148</li>
          <li>${icon("map")} 125 Market Street, New York, NY</li>
        </ul>
        <div class="contact-hours"><strong>Support hours</strong><span>Monday to Friday, 9:00 AM - 6:00 PM ET</span></div>
      </div>
      <form class="form-card" data-contact-form novalidate>
        <label class="field"><span>Name</span><input name="name" type="text" autocomplete="name" aria-describedby="contact-name-error"><small class="field-error" id="contact-name-error"></small></label>
        <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" aria-describedby="contact-email-error"><small class="field-error" id="contact-email-error"></small></label>
        <label class="field"><span>Subject</span><input name="subject" type="text" aria-describedby="contact-subject-error"><small class="field-error" id="contact-subject-error"></small></label>
        <label class="field"><span>Message</span><textarea name="message" rows="7" aria-describedby="contact-message-error"></textarea><small class="field-error" id="contact-message-error"></small></label>
        <button class="btn btn-primary" type="submit">${icon("send")}Send message</button>
        <p class="success-message" data-form-success tabindex="-1" hidden></p>
      </form>
    </section>
  `;
}

function notFoundTemplate() {
  return `
    <section class="section-shell">
      <div class="empty-state">
        <h1>Page not found</h1>
        <p>The route you requested is not available in CareerConnect.</p>
        <a class="btn btn-primary" href="#home">${icon("arrow")}Return home</a>
      </div>
    </section>
  `;
}

function setupHome(root) {
  root.querySelector("[data-home-search]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const keyword = new FormData(event.currentTarget).get("keyword").trim();
    window.location.hash = keyword ? `jobs?keyword=${encodeURIComponent(keyword)}` : "jobs";
  });
  animateCounters(root);
  initDashboardCharts(root, currentFeed?.jobs || getActiveJobs());
}

function routeNeedsJobs(route) {
  return ["home", "jobs", "companies", "company", "saved", "job", "apply"].includes(route);
}

export async function renderRoute() {
  const { route, params } = parseHash();
  app.innerHTML = loadingTemplate();

  let html = "";
  let meta = routeMeta[route] || routeMeta.home;
  let setup = () => {};

  try {
    const filters = getInitialFilters(params);
    const feed = routeNeedsJobs(route) ? await loadJobFeed(route === "jobs" ? filters : {}) : currentFeed;
    const jobs = feed?.jobs || getActiveJobs();

    if (route === "home") {
      const newsFeed = await loadNewsFeed();
      html = homeTemplate(feed, newsFeed);
      setup = setupHome;
    } else if (route === "jobs") {
      html = jobsTemplate(feed, params);
      setup = (root) => setupJobsRoute(root, feed);
    } else if (route === "job") {
      const job = getActiveJobById(params.get("id")) || jobs.find((item) => item.id === params.get("id"));
      if (!job) {
        html = notFoundTemplate();
        meta = { title: "Job Not Found | CareerConnect", description: "The requested job could not be found." };
      } else {
        html = jobDetailTemplate(job);
        meta = { title: `${job.title} at ${job.company} | CareerConnect`, description: `${job.title} in ${job.location}. ${formatSalary(job)}.` };
      }
    } else if (route === "companies") {
      html = companiesTemplate(jobs);
      setup = () => initJobsMap("#companies-map", getCompanies(jobs).map((company) => company.jobs[0]).filter(Boolean));
    } else if (route === "company") {
      const company = getCompanyById(jobs, params.get("id"));
      if (!company) {
        html = notFoundTemplate();
        meta = { title: "Company Not Found | CareerConnect", description: "The requested company could not be found." };
      } else {
        html = companyDetailTemplate(company);
        meta = { title: `${company.name} Careers | CareerConnect`, description: `${company.name} is hiring for ${company.openJobs} open roles.` };
      }
    } else if (route === "saved") {
      html = savedTemplate(jobs);
    } else if (route === "news") {
      const newsFeed = await loadNewsFeed(true);
      html = newsTemplate(newsFeed);
    } else if (route === "apply") {
      const job = getActiveJobById(params.get("job")) || jobs.find((item) => item.id === params.get("job")) || null;
      html = applyTemplate(job);
      setup = (root) => setupApplyForm(root, job);
      meta = job ? { title: `Apply for ${job.title} | CareerConnect`, description: `Apply for ${job.title} at ${job.company}.` } : routeMeta.apply;
    } else if (route === "about") {
      html = aboutTemplate();
    } else if (route === "contact") {
      html = contactTemplate();
      setup = setupContactForm;
    } else {
      html = notFoundTemplate();
      meta = { title: "Page Not Found | CareerConnect", description: "The requested page could not be found." };
    }

    app.innerHTML = html;
    setup(app);
    updateMeta(meta);
    setActiveNav(route);
    requestAnimationFrame(() => {
      app.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.dispatchEvent(new CustomEvent("careerconnect:route-rendered", { detail: { route } }));
  } catch (error) {
    console.error(error);
    app.innerHTML = errorTemplate(error.message || "CareerConnect could not render this page.");
    updateMeta({ title: "Loading Error | CareerConnect", description: "CareerConnect could not load the requested content." });
    notify("CareerConnect could not load the requested page.");
  }
}

export function initRouter() {
  if (!window.location.hash) {
    history.replaceState(null, "", "#home");
  }
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}
