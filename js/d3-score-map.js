import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const dataUrl = "./data/score_map_hex.json";

const METRICS = {
  dc_score: {
    label: "GridScore",
    description: "Composite score balancing sustainability and profitability (60/40 weighting).",
  },
  dc_score_smooth: {
    label: "GridScore (smoothed)",
    description: "Neighbor-smoothed GridScore to reduce noise between adjacent hexes.",
  },
  sustainability: {
    label: "Sustainability",
    description: "ESG tilt driven by renewables share, volatility, and cooling friendliness.",
  },
  profitability: {
    label: "Profitability",
    description: "Operational efficiency from price stability, peak load, and volatility.",
  },
  dc_score_temp: {
    label: "Cooling advantage",
    description: "Temperature-adjusted score that rewards cooler microclimates.",
  },
};

const defaultMetric = "dc_score";
const svg = d3.select("#score-map");
const mapShell = document.querySelector(".map-shell");
const tooltip = d3.select("#tooltip");
const metricCopy = document.querySelector(".metric-copy");
const metricSelect = document.getElementById("metric-select");
const legendSwatch = d3.select(".legend__swatch");
const legendMin = d3.select("[data-role='legend-min']");
const legendMax = d3.select("[data-role='legend-max']");

const colorScale = d3.scaleSequential().interpolator(d3.interpolateRdYlGn);

let featureCollection;
let features = [];
let filteredFeatures = [];
let filteredFeatureCollection;
let projection;
let pathGenerator;
const cellLayer = svg.append("g").attr("data-layer", "cells");

init();

async function init() {
  try {
    featureCollection = await d3.json(dataUrl);
    features = featureCollection?.features ?? [];
    filteredFeatureCollection = conusFeatureCollection(features);
    filteredFeatures = filteredFeatureCollection.features;
    buildMetricOptions();
    setMetricCopy(metricSelect.value);
    resize();
    window.addEventListener("resize", debounce(resize, 150));
    metricSelect.addEventListener("change", handleMetricChange);
  } catch (error) {
    console.error("Failed to load score map data", error);
    metricCopy.textContent = "Unable to load score map data. Check the network path to score_map.json.";
  }
}

function buildMetricOptions() {
  Object.entries(METRICS).forEach(([key, meta]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = meta.label;
    metricSelect.appendChild(opt);
  });
  metricSelect.value = defaultMetric;
}

function handleMetricChange() {
  const metric = metricSelect.value;
  setMetricCopy(metric);
  drawCells(metric);
}

function resize() {
  if (!featureCollection) return;
  const rect = mapShell.getBoundingClientRect();
  const width = rect.width || 960;
  const height = Math.max(520, window.innerHeight * 0.65);

  svg.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");
  projection = d3.geoMercator().fitSize([width, height], filteredFeatureCollection);
  pathGenerator = d3.geoPath(projection);

  drawCells(metricSelect.value);
}

function drawCells(metric) {
  if (!filteredFeatures.length || !pathGenerator) return;

  const domain = metricDomain(filteredFeatures, metric);
  colorScale.domain(domain);
  updateLegend(domain);

  const cells = cellLayer.selectAll("path.hex-cell").data(filteredFeatures, (d) => d.id ?? d.properties?.hex_id);

  cells
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "hex-cell")
          .attr("d", pathGenerator)
          .attr("fill", (d) => colorFor(d, metric))
          .attr("stroke", "rgba(255, 255, 255, 0.08)")
          .attr("stroke-width", 0.35)
          .on("mousemove", (event, d) => showTooltip(event, d, metric))
          .on("mouseleave", hideTooltip),
      (update) =>
        update
          .transition()
          .duration(400)
          .attr("d", pathGenerator)
          .attr("fill", (d) => colorFor(d, metric))
    );
}

function metricDomain(data, metric) {
  const values = data
    .map((d) => valueFor(d, metric))
    .filter((v) => Number.isFinite(v));
  const [min, max] = d3.extent(values.length ? values : [0, 1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [0, 1];
  }
  return [min, max];
}

function valueFor(feature, metric) {
  const v = feature?.properties?.[metric];
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function colorFor(feature, metric) {
  const v = valueFor(feature, metric);
  return v === null ? "rgba(255, 255, 255, 0.05)" : colorScale(v);
}

function updateLegend(domain) {
  const [min, max] = domain;
  const stops = d3.range(0, 1.01, 0.1).map((t) => {
    const v = min + t * (max - min);
    return `${colorScale(v)} ${Math.round(t * 100)}%`;
  });
  legendSwatch.style("background", `linear-gradient(to right, ${stops.join(",")})`);
  legendMin.text(formatValue(min));
  legendMax.text(formatValue(max));
}

function setMetricCopy(metricKey) {
  const meta = METRICS[metricKey];
  metricCopy.textContent = meta ? meta.description : "";
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toString() : "—";
}

function showTooltip(event, feature, metric) {
  const props = feature.properties ?? {};
  const activeMetric = METRICS[metric] ? metric : defaultMetric;
  const html = `
    <div class="tooltip__title">${props.region ?? "Unassigned region"}</div>
    <div class="tooltip__metric">
      <span>${METRICS[activeMetric].label}</span>
      <span>${formatValue(valueFor(feature, activeMetric))}</span>
    </div>
    <div class="tooltip__grid">
      <span>Profitability</span><span>${formatValue(props.profitability)}</span>
      <span>Sustainability</span><span>${formatValue(props.sustainability)}</span>
      <span>GridScore (smoothed)</span><span>${formatValue(props.dc_score_smooth)}</span>
      <span>Cooling boost</span><span>${formatValue(props.temp_cool_score)}</span>
      <span>Distance to region</span><span>${Number.isFinite(props.dist_to_region) ? `${Math.round(props.dist_to_region / 1000)} km` : "—"}</span>
    </div>
  `;
  tooltip.html(html);
  tooltip.classed("visible", true);

  const offset = 14;
  const { pageX, pageY } = event;
  tooltip
    .style("left", `${pageX + offset}px`)
    .style("top", `${pageY + offset}px`);
}

function hideTooltip() {
  tooltip.classed("visible", false);
}

function debounce(fn, delay = 150) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn.apply(null, args), delay);
  };
}

// Restrict to CONUS so the map is zoomed into the lower 48
function conusFeatureCollection(allFeatures) {
  const filtered = (allFeatures ?? []).filter((f) => {
    const [lon, lat] = d3.geoCentroid(f);
    return lon >= -130 && lon <= -60 && lat >= 22 && lat <= 52;
  });
  return {
    type: "FeatureCollection",
    features: filtered.length ? filtered : allFeatures ?? [],
  };
}
