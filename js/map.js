function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetMapContainer(element) {
  if (element._careerConnectMap) {
    element._careerConnectMap.remove();
    element._careerConnectMap = null;
  }

  if (element._leaflet_id) {
    delete element._leaflet_id;
  }

  element.innerHTML = "";
}

export function initJobsMap(selector, jobs = []) {
  const element = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!element) {
    return;
  }

  resetMapContainer(element);

  if (!window.L) {
    element.innerHTML = '<div class="map-fallback">Interactive map unavailable. Job cards still include location details.</div>';
    return;
  }

  const locatedJobs = jobs.filter((job) => Number.isFinite(Number(job.latitude)) && Number.isFinite(Number(job.longitude)));
  if (!locatedJobs.length) {
    element.innerHTML = '<div class="map-fallback">No mappable job locations are available for this search.</div>';
    return;
  }

  const map = window.L.map(element, {
    scrollWheelZoom: false
  });
  element._careerConnectMap = map;

  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const markers = locatedJobs.slice(0, 80).map((job) => {
    const marker = window.L.marker([Number(job.latitude), Number(job.longitude)]).addTo(map);
    marker.bindPopup(`
      <strong>${escapeHTML(job.title)}</strong><br>
      ${escapeHTML(job.company)}<br>
      ${escapeHTML(job.location)}<br>
      <a href="#job?id=${encodeURIComponent(job.id)}">View job details</a>
    `);
    marker.on("click", () => {
      window.dispatchEvent(new CustomEvent("careerconnect:map-job", { detail: { jobId: job.id } }));
    });
    return marker;
  });

  const group = window.L.featureGroup(markers);
  map.fitBounds(group.getBounds().pad(0.18));
  window.setTimeout(() => map.invalidateSize(), 160);
}
