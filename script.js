// script.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 960;
const height = 600;

const svg = d3
  .select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoAlbersUsa()
  .translate([width / 2, height / 2])
  .scale(1200);

const path = d3.geoPath().projection(projection);

const tooltip = d3.select("#tooltip");
const metricSelect = d3.select("#metric-select");

// current metric used for COLORING
let currentMetric = metricSelect.node().value; // "score_combo" initially

let geoData;
let stateMetrics; // Map: state name -> metric row

// ----------------------------------------------------
// Load GeoJSON + CSV
// ----------------------------------------------------
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
  d3.csv("data/state_metrics.csv", d3.autoType)
]).then(([us, metrics]) => {

  geoData = {
    type: "FeatureCollection",
    features: topojson.feature(us, us.objects.states).features
  };
  
  stateMetrics = new Map(metrics.map(d => [d.state, d]));

  drawMap();
  metricSelect.on("change", () => {
    currentMetric = metricSelect.node().value;
    updateColors();
  });
});

// ----------------------------------------------------
// Draw the map initially
// ----------------------------------------------------
function drawMap() {
  const states = geoData.features;

  // Collect values of the current metric for color scale
  const values = [];
  for (const f of states) {
    const name = f.properties.name;
    const m = stateMetrics.get(name);
    if (m && m[currentMetric] != null) {
      values.push(m[currentMetric]);
    }
  }

  // Color scale based on NORMALIZED metric (0–1)
  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain(d3.extent(values));

  // store color scale on the svg for reuse
  svg.node().__colorScale__ = color;

  svg
    .selectAll("path")
    .data(states)
    .join("path")
    .attr("d", path)
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("fill", d => {
      const name = d.properties.name;
      const m = stateMetrics.get(name);
      return m && m[currentMetric] != null ? color(m[currentMetric]) : "#eee";
    })
    .on("mouseover", function (event, d) {
      const name = d.properties.name;
      const m = stateMetrics.get(name);

      if (!m) {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${name}</strong><br/>No data available`);
        return;
      }

      const demandRaw = m.demand_raw;        // raw MWh (from CSV)
      const demandScore = m.score_demand;    // normalized
      const combo = m.score_combo;
      const renew = m.score_renewables;

      // Show RAW demand + normalized scores
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${name}</strong><br/>
           Raw demand: ${demandRaw.toLocaleString()} MWh<br/>
           Normalized demand score: ${formatVal(demandScore)}<br/>
           Overall potential (combo): ${formatVal(combo)}<br/>
           Renewables score (placeholder): ${formatVal(renew)}`
        );
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    });
}

// ----------------------------------------------------
// Update colors when the metric dropdown changes
// ----------------------------------------------------
function updateColors() {
  const states = geoData.features;
  const color = svg.node().__colorScale__;

  // Recompute domain for the new metric
  const values = [];
  for (const f of states) {
    const m = stateMetrics.get(f.properties.name);
    if (m && m[currentMetric] != null) {
      values.push(m[currentMetric]);
    }
  }
  color.domain(d3.extent(values));

  svg
    .selectAll("path")
    .transition()
    .duration(500)
    .attr("fill", d => {
      const name = d.properties.name;
      const m = stateMetrics.get(name);
      return m && m[currentMetric] != null ? color(m[currentMetric]) : "#eee";
    });
}

// ----------------------------------------------------
// Helper for formatting numbers in tooltip
// ----------------------------------------------------
function formatVal(v) {
  if (typeof v === "number") return v.toFixed(3);
  return v ?? "N/A";
}
