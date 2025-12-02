import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import mapboxgl from "mapbox-gl";
import Navbar from "@/components/Navbar";
import Dither from "@/components/Dither";

const BASE_PATH = import.meta.env.BASE_URL ?? "/";

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
  local_temp_c: {
    label: "Local temperature (°C)",
    description: "Average local temperature per hex so cooler microclimates pop out.",
  },
  elevation_m: {
    label: "Elevation (m)",
    description: "Elevation per hex for quick terrain context.",
  },
};

const defaultMetric = "dc_score";

export default function D3ScoreMapPage() {
  const svgRef = useRef(null);
  const wrapperRef = useRef(null);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const featureCollectionRef = useRef(null);
  const pathRef = useRef(null);

  const [metric, setMetric] = useState(defaultMetric);
  const [domain, setDomain] = useState([0, 1]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [features, setFeatures] = useState([]);

  const metricCopy = useMemo(() => METRICS[metric]?.description ?? "", [metric]);

  useEffect(() => {
    let isMounted = true;
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    // Initialize Mapbox once data is loaded
    const load = async () => {
      try {
        setStatus("loading");
        const res = await fetch(`${BASE_PATH}data/score_map_hex.json`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!isMounted) return;
        featureCollectionRef.current = json;
        setFeatures(json.features ?? []);
        initMap();
        setStatus("ready");
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load score map data.");
        setStatus("error");
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    render();
  }, [metric, features]);

  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [metric, features]);

  const initMap = () => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5, 39],
      zoom: 3.5,
      pitch: 0,
      bearing: 0,
      interactive: true,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-left");

    map.on("load", () => {
      mapRef.current = map;
      render();
    });

    map.on("move", () => render());
    map.on("resize", () => render());
  };

  const render = () => {
    if (!wrapperRef.current || !svgRef.current || !featureCollectionRef.current || !features.length) return;

    const svg = d3.select(svgRef.current);
    const mapEl = mapContainerRef.current;
    const map = mapRef.current;
    if (!mapEl || !map) return;

    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const mapContainerRect = map.getContainer().getBoundingClientRect();
    const width = mapEl.clientWidth || mapContainerRect.width || wrapperRect?.width || 960;
    const height = mapEl.clientHeight || mapContainerRect.height || wrapperRect?.height || 520;
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const project = (lon, lat) => map.project([lon, lat]);
    const projection = {
      stream: (s) => ({
        point(lon, lat) {
          const p = project(lon, lat);
          s.point(p.x, p.y);
        },
        lineStart() { s.lineStart(); },
        lineEnd() { s.lineEnd(); },
        polygonStart() { s.polygonStart(); },
        polygonEnd() { s.polygonEnd(); },
      }),
    };
    const path = d3.geoPath(projection);
    pathRef.current = path;
    const values = features.map((f) => valueFor(f, metric)).filter((v) => v !== null);
    const [min, max] = values.length ? d3.extent(values) : [0, 1];
    const safeDomain = Number.isFinite(min) && Number.isFinite(max) && min !== max ? [min, max] : [0, 1];
    setDomain((prev) => (prev[0] === safeDomain[0] && prev[1] === safeDomain[1] ? prev : safeDomain));

    const color = d3.scaleSequential(safeDomain, d3.interpolateRdYlGn);
    const layer = svg.select("g[data-layer='cells']").empty()
      ? svg.append("g").attr("data-layer", "cells")
      : svg.select("g[data-layer='cells']");

    const cells = layer.selectAll("path.hex-cell").data(
      features,
      (d) => d.id ?? d.properties?.hex_id ?? Math.random(),
    );

    cells
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "hex-cell")
            .attr("d", path)
            .attr("fill", (d) => colorFor(d, metric, color))
            .attr("stroke", "rgba(255,255,255,0.08)")
            .attr("stroke-width", 0.35)
            .on("mousemove", (event, d) => showTooltip(event, d, metric))
            .on("mouseleave", hideTooltip),
        (update) =>
          update
            .attr("d", path)
            .attr("fill", (d) => colorFor(d, metric, color)),
        (exit) => exit.remove(),
      );
  };

  const legendStops = useMemo(() => {
    const [min, max] = domain;
    const color = d3.scaleSequential(domain, d3.interpolateRdYlGn);
    return d3.range(0, 1.01, 0.1).map((t) => {
      const v = min + t * (max - min);
      return { color: color(v), offset: Math.round(t * 100) };
    });
  }, [domain]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050910] text-white">
      <div className="absolute inset-0 -z-10 opacity-70">
        <Dither
          className="h-full w-full"
          waveColor={[0.5, 0.7, 0.5]}
          disableAnimation={false}
          enableMouseInteraction={false}
          mouseRadius={0.3}
          colorNum={6.7}
          waveAmplitude={0}
          waveFrequency={0}
          waveSpeed={0.01}
        />
        <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-b from-transparent to-[#050910]" />
      </div>

      <Navbar />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-24">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.35)]">
          D3-only GridScore dashboard
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            GridCast Score Map
          </h1>
          <p className="max-w-4xl text-lg text-white/70">
            Interactive hex-grid visualization powered by D3 and Tailwind. Hover any cell to inspect profitability,
            sustainability, temperature, elevation, and cooling-friendly metrics driving the GridScore.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm uppercase tracking-wide text-white/60">Color by</label>
            <select
              className="rounded-xl border border-white/10 bg-[#0c1421] px-4 py-3 text-base text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              {Object.entries(METRICS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-white/70">{metricCopy}</span>
          </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/60">
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1">Source: score_map_hex.json</span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1">Rendering: D3 geo + SVG</span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1">Hover cells for details</span>
          </div>
        </div>

        <div
          ref={wrapperRef}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a1320] via-[#08111d] to-[#0e1624] shadow-[0_30px_80px_rgba(0,0,0,0.35)] h-[70vh] min-h-[520px]"
        >
          <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
          <svg ref={svgRef} className="absolute inset-0 h-full w-full"></svg>
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute left-0 top-0 z-10 hidden min-w-[240px] rounded-2xl border border-white/10 bg-[#0c1622]/95 p-4 text-sm shadow-2xl backdrop-blur-md"
          />
          {status === "loading" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10 text-white/70">
              Loading grid…
            </div>
          )}
          {status === "error" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20 text-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-white/70">
          <span className="w-16 text-right font-mono text-xs text-white/60">{formatValue(domain[0])}</span>
          <div className="flex-1 rounded-full border border-white/10 p-[1px]">
            <div className="h-3 w-full rounded-full" style={{ background: legendGradient(legendStops) }} />
          </div>
          <span className="w-16 text-left font-mono text-xs text-white/60">{formatValue(domain[1])}</span>
        </div>
      </main>
    </div>
  );

  function showTooltip(event, feature, activeMetric) {
    if (!tooltipRef.current) return;
    const tooltip = d3.select(tooltipRef.current);
    const props = feature?.properties ?? {};
    const active = METRICS[activeMetric] ? activeMetric : defaultMetric;
    const hexId = props.hex_id ?? props.id ?? "—";
    const regionLabel = props.region ? ` · ${props.region}` : "";
    const latLon =
      Number.isFinite(props.lat) && Number.isFinite(props.lon)
        ? `${formatValue(props.lat, 2)}, ${formatValue(props.lon, 2)}`
        : "—";
    const html = `
      <div class="text-xs text-white/60 uppercase tracking-wide">Hexagon ${hexId}${regionLabel}</div>
      <div class="text-xs text-white/50 mb-1">Lat/Lon: ${latLon}</div>
      <div class="flex items-center justify-between border-b border-white/10 pb-2 text-emerald-200">
        <span>${METRICS[active].label}</span>
        <span class="font-mono text-base text-white">${formatValue(valueFor(feature, active))}</span>
      </div>
      <div class="mt-2 grid grid-cols-2 gap-y-1 text-white/70">
        <span>GridScore</span><span class="text-white text-right font-mono">${formatValue(props.dc_score)}</span>
        <span>GridScore (smooth)</span><span class="text-white text-right font-mono">${formatValue(props.dc_score_smooth)}</span>
        <span>Profitability</span><span class="text-white text-right font-mono">${formatValue(props.profitability)}</span>
        <span>Sustainability</span><span class="text-white text-right font-mono">${formatValue(props.sustainability)}</span>
        <span>Cooling boost</span><span class="text-white text-right font-mono">${formatValue(props.temp_cool_score)}</span>
        <span>Cooling advantage</span><span class="text-white text-right font-mono">${formatValue(props.dc_score_temp)}</span>
        <span>Local temp (°C)</span><span class="text-white text-right font-mono">${formatValue(props.local_temp_c, 1)}</span>
        <span>Elevation (m)</span><span class="text-white text-right font-mono">${formatValue(props.elevation_m, 0)}</span>
        <span>Distance to region</span><span class="text-white text-right font-mono">${Number.isFinite(props.dist_to_region) ? `${Math.round(props.dist_to_region / 1000)} km` : "—"}</span>
      </div>
    `;
    tooltip.html(html).style("display", "block").classed("hidden", false);

    const offset = 16;
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const left = (event.clientX - (wrapperRect?.left ?? 0)) + offset;
    const top = (event.clientY - (wrapperRect?.top ?? 0)) + offset;
    tooltip
      .style("left", `${left}px`)
      .style("top", `${top}px`);
  }

  function hideTooltip() {
    if (!tooltipRef.current) return;
    const tooltip = d3.select(tooltipRef.current);
    tooltip.classed("hidden", true);
  }
}

function valueFor(feature, metric) {
  const v = feature?.properties?.[metric];
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function colorFor(feature, metric, colorScale) {
  const v = valueFor(feature, metric);
  return v === null ? "rgba(255,255,255,0.06)" : colorScale(v);
}

function formatValue(value, digits) {
  if (!Number.isFinite(value)) return "—";
  if (typeof digits === "number") {
    return d3.format(`.${digits}f`)(value);
  }
  // No rounding when digits not provided
  return value.toString();
}

function legendGradient(stops) {
  return `linear-gradient(to right, ${stops.map((s) => `${s.color} ${s.offset}%`).join(",")})`;
}

function conusFeatureCollection(features) {
  const filtered = features.filter((f) => {
    const coords = f?.geometry?.coordinates;
    if (!coords) return false;
    const centroid = d3.geoCentroid(f);
    const [lon, lat] = centroid;
    return lon >= -130 && lon <= -60 && lat >= 22 && lat <= 52;
  });
  return {
    type: "FeatureCollection",
    features: filtered.length ? filtered : features,
  };
}
