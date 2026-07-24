import { getCategoryStats } from "./jobs.js";

function getThemeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function countBy(jobs, field) {
  return jobs.reduce((accumulator, job) => {
    const key = job[field] || "Unknown";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function renderFallback(canvas, labels, values) {
  const container = canvas.closest(".chart-card");
  if (!container) {
    return;
  }
  const list = labels.map((label, index) => `<li><span>${label}</span><strong>${values[index]}</strong></li>`).join("");
  container.insertAdjacentHTML("beforeend", `<ul class="chart-fallback">${list}</ul>`);
  canvas.hidden = true;
}

export function animateCounters(root = document) {
  const counters = root.querySelectorAll("[data-counter]");
  counters.forEach((counter) => {
    const target = Number(counter.dataset.counter || 0);
    if (!Number.isFinite(target)) {
      counter.textContent = counter.dataset.counter || "0";
      return;
    }
    const duration = 720;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      counter.textContent = String(value);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  });
}

export function initDashboardCharts(root, jobs = []) {
  const categoryCanvas = root.querySelector("[data-category-chart]");
  const workplaceCanvas = root.querySelector("[data-workplace-chart]");
  const categoryStats = getCategoryStats(jobs).slice(0, 6);
  const workplaceCounts = countBy(jobs, "workplace");
  const textColor = getThemeColor("--muted-strong") || "#334155";
  const gridColor = getThemeColor("--line") || "#d8e3f0";
  const colors = ["#174ea6", "#00a88f", "#f59e0b", "#7c3aed", "#dc2626", "#0f766e"];

  if (categoryCanvas) {
    const labels = categoryStats.map((item) => item.name);
    const values = categoryStats.map((item) => item.count);
    if (!window.Chart) {
      renderFallback(categoryCanvas, labels, values);
    } else {
      new window.Chart(categoryCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Open jobs",
            data: values,
            backgroundColor: colors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { color: textColor },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: { color: textColor, precision: 0 },
              grid: { color: gridColor }
            }
          }
        }
      });
    }
  }

  if (workplaceCanvas) {
    const labels = Object.keys(workplaceCounts);
    const values = Object.values(workplaceCounts);
    if (!window.Chart) {
      renderFallback(workplaceCanvas, labels, values);
    } else {
      new window.Chart(workplaceCanvas, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: textColor, boxWidth: 12, boxHeight: 12 }
            }
          }
        }
      });
    }
  }
}
