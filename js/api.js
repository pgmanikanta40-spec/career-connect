import { enrichJob, loadJobs } from "./jobs.js";

const apiConfigKey = "careerconnect.apiConfig";
const activeJobsKey = "careerconnect.activeJobs";
let activeJobs = [];
let lastSource = "local";

function readConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(apiConfigKey) || "{}");
    return {
      provider: "adzuna",
      adzunaCountry: "us",
      ...stored,
      ...(window.CAREERCONNECT_CONFIG || {})
    };
  } catch (error) {
    console.warn("CareerConnect API config could not be read.", error);
    return window.CAREERCONNECT_CONFIG || {};
  }
}

function writeActiveJobs(jobs) {
  activeJobs = jobs;
  try {
    sessionStorage.setItem(activeJobsKey, JSON.stringify(jobs.slice(0, 80)));
  } catch (error) {
    console.warn("CareerConnect could not cache active jobs.", error);
  }
}

function readActiveJobs() {
  if (activeJobs.length) {
    return activeJobs;
  }
  try {
    const cached = JSON.parse(sessionStorage.getItem(activeJobsKey) || "[]");
    activeJobs = Array.isArray(cached) ? cached : [];
  } catch (error) {
    activeJobs = [];
  }
  return activeJobs;
}

function asDate(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function cleanText(value) {
  const element = document.createElement("div");
  element.innerHTML = String(value || "");
  return element.textContent.trim();
}

function detectCategory(text) {
  const value = `${text}`.toLowerCase();
  if (value.includes("engineer") || value.includes("developer") || value.includes("software")) return "Technology";
  if (value.includes("data") || value.includes("analyst") || value.includes("analytics")) return "Data";
  if (value.includes("design") || value.includes("ux")) return "Design";
  if (value.includes("marketing")) return "Marketing";
  if (value.includes("finance") || value.includes("risk")) return "Finance";
  if (value.includes("health") || value.includes("clinical")) return "Healthcare";
  if (value.includes("security")) return "Security";
  if (value.includes("operations") || value.includes("logistics")) return "Operations";
  return "General";
}

function fallbackLogo(company) {
  const logos = [
    "assets/images/company-atlas.svg",
    "assets/images/company-nimbus.svg",
    "assets/images/company-prism.svg",
    "assets/images/company-civic.svg"
  ];
  const index = Math.abs([...String(company || "CareerConnect")].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % logos.length;
  return logos[index];
}

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  return search.toString();
}

function normalizeAdzunaJob(job) {
  const title = job.title || "Open Role";
  const company = job.company?.display_name || "Hiring Company";
  const location = job.location?.display_name || "United States";
  const description = cleanText(job.description || `${company} is hiring for ${title}.`);
  const jobType = job.contract_time === "part_time" ? "Part-time" : job.contract_time === "contract" ? "Contract" : "Full-time";

  return enrichJob({
    id: `adzuna-${job.id}`,
    title,
    company,
    companyId: `adzuna-${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    companyLogo: fallbackLogo(company),
    industry: job.category?.label || detectCategory(`${title} ${description}`),
    category: job.category?.label || detectCategory(`${title} ${description}`),
    location,
    companyLocation: location,
    salaryMin: Number(job.salary_min) || 0,
    salaryMax: Number(job.salary_max) || 0,
    currency: "$",
    experienceMin: 0,
    experienceMax: 20,
    employmentType: jobType,
    jobType,
    workplace: /remote/i.test(`${title} ${location} ${description}`) ? "Remote" : "On-site",
    postedDate: asDate(job.created),
    description,
    applicationLink: job.redirect_url,
    website: job.redirect_url,
    skills: [detectCategory(`${title} ${description}`), jobType].filter(Boolean)
  }, "adzuna");
}

function normalizeJSearchJob(job) {
  const title = job.job_title || "Open Role";
  const company = job.employer_name || "Hiring Company";
  const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ") || "United States";
  const description = cleanText(job.job_description || `${company} is hiring for ${title}.`);
  const jobType = job.job_employment_type ? job.job_employment_type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Full-time";

  return enrichJob({
    id: `jsearch-${job.job_id}`,
    title,
    company,
    companyId: `jsearch-${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    companyLogo: job.employer_logo || fallbackLogo(company),
    industry: detectCategory(`${title} ${description}`),
    category: detectCategory(`${title} ${description}`),
    location,
    companyLocation: location,
    salaryMin: Number(job.job_min_salary) || 0,
    salaryMax: Number(job.job_max_salary) || 0,
    currency: job.job_salary_currency === "USD" || !job.job_salary_currency ? "$" : job.job_salary_currency,
    employmentType: jobType,
    jobType,
    workplace: job.job_is_remote ? "Remote" : /hybrid/i.test(description) ? "Hybrid" : "On-site",
    postedDate: asDate(job.job_posted_at_datetime_utc),
    description,
    applicationLink: job.job_apply_link || job.job_google_link,
    website: job.employer_website || job.job_apply_link,
    skills: [detectCategory(`${title} ${description}`), jobType].filter(Boolean)
  }, "jsearch");
}

function buildQuery(filters = {}) {
  return [filters.keyword || filters.query, filters.company, filters.experience ? `${filters.experience} years experience` : ""]
    .filter(Boolean)
    .join(" ")
    .trim() || "software engineer";
}

async function fetchAdzunaJobs(filters, config) {
  const country = config.adzunaCountry || "us";
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${queryString({
    app_id: config.adzunaAppId,
    app_key: config.adzunaAppKey,
    what: buildQuery(filters),
    where: filters.location,
    salary_min: filters.salary,
    results_per_page: 40,
    sort_by: "date",
    "content-type": "application/json"
  })}`;

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(response.status === 429 ? "Adzuna API limit reached." : "Adzuna API unavailable.");
  }
  const payload = await response.json();
  return (payload.results || []).map(normalizeAdzunaJob);
}

async function fetchJSearchJobs(filters, config) {
  const url = `https://jsearch.p.rapidapi.com/search?${queryString({
    query: `${buildQuery(filters)} ${filters.location || ""}`.trim(),
    page: "1",
    num_pages: "1",
    date_posted: "all"
  })}`;

  const response = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": config.rapidApiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }
  });
  if (!response.ok) {
    throw new Error(response.status === 429 ? "JSearch API limit reached." : "JSearch API unavailable.");
  }
  const payload = await response.json();
  return (payload.data || []).map(normalizeJSearchJob);
}

async function fallbackJobs(message = "Using local fallback job data.", notify = true) {
  const jobs = await loadJobs();
  writeActiveJobs(jobs);
  lastSource = "local";
  return {
    jobs,
    source: "local",
    isFallback: true,
    message,
    notify
  };
}

export function getApiConfig() {
  return readConfig();
}

export function hasLiveJobProvider() {
  const config = readConfig();
  return Boolean((config.adzunaAppId && config.adzunaAppKey) || config.rapidApiKey);
}

export async function fetchJobs(filters = {}) {
  const config = readConfig();

  try {
    let jobs = [];
    let source = "local";

    if (config.provider === "jsearch" && config.rapidApiKey) {
      jobs = await fetchJSearchJobs(filters, config);
      source = "jsearch";
    } else if (config.adzunaAppId && config.adzunaAppKey) {
      jobs = await fetchAdzunaJobs(filters, config);
      source = "adzuna";
    } else if (config.rapidApiKey) {
      jobs = await fetchJSearchJobs(filters, config);
      source = "jsearch";
    } else {
      return fallbackJobs("Showing local jobs from the built-in fallback feed.", false);
    }

    if (!jobs.length) {
      return fallbackJobs("The live jobs API returned no listings, so local jobs were loaded.", true);
    }

    writeActiveJobs(jobs);
    lastSource = source;
    return {
      jobs,
      source,
      isFallback: false,
      message: `${jobs.length} live jobs loaded from ${source === "adzuna" ? "Adzuna" : "JSearch"}.`,
      notify: true
    };
  } catch (error) {
    console.warn(error);
    return fallbackJobs(error.message || "The live jobs API is unavailable, so local jobs were loaded.", true);
  }
}

export function getActiveJobs() {
  return readActiveJobs();
}

export function getActiveJobById(jobId) {
  return readActiveJobs().find((job) => job.id === jobId) || null;
}

export function getLastJobSource() {
  return lastSource;
}
