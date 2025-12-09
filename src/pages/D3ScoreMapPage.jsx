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
  sustainability: {
    label: "Sustainability",
    description: "Sustainability is driven by renewable share, grid volatility, and the site’s cooling suitability.",
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
const ANNOTATIONS = [
  {
    id: "pnw",
    label: "Cool, high-GridScore cluster (PNW)",
    colorClass: "bg-emerald-300",
    coords: [-122.7, 45.6], // lon, lat
  },
  {
    id: "south",
    label: "Warmer, costlier cells across the South",
    colorClass: "bg-amber-300",
    coords: [-90, 30], // lon, lat
  },
  {
    id: "carolinas",
    label: "Carolinas: top GridScore – sustainable and profitable",
    colorClass: "bg-emerald-200",
    coords: [-79.8, 34.9], // lon, lat near Carolinas
  },
];

export default function D3ScoreMapPage() {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const featureCollectionRef = useRef(null);
  const frameIdRef = useRef(null);
  const isPanningRef = useRef(false);
  const mapReadyRef = useRef(false);
  const prevMetricRef = useRef(defaultMetric);
  const metricRef = useRef(defaultMetric);
  const visibleFeaturesRef = useRef([]);
  const metricDomainsRef = useRef({});
  const palettesRef = useRef({});
  const quadtreeRef = useRef(null);
  const hoveredFeatureRef = useRef(null);
  const clearHoverRef = useRef(null);
  const annotationRefs = useRef({});

  const [metric, setMetric] = useState(defaultMetric);
  const [domain, setDomain] = useState([0, 1]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [features, setFeatures] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  const metricCopy = useMemo(() => METRICS[metric]?.description ?? "", [metric]);

  // Initialize map on mount
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

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
    clearHoverRef.current = () => {
      if (hoveredFeatureRef.current) {
        hoveredFeatureRef.current = null;
        if (mapReadyRef.current && mapRef.current && featureCollectionRef.current) {
          render();
        }
      }
      hideTooltip();
    };

    map.on("load", () => {
      mapRef.current = map;
      mapReadyRef.current = true;
      setMapReady(true);
    });

    map.on("movestart", () => {
      isPanningRef.current = true;
      hideTooltip();
    });

    const scheduleRender = () => {
      if (frameIdRef.current) return;
      frameIdRef.current = requestAnimationFrame(() => {
        frameIdRef.current = null;
        render();
      });
    };

    map.on("move", scheduleRender);

    // Render once after panning/zooming stops
    map.on("moveend", () => {
      isPanningRef.current = false;
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      render();
    });

    map.on("resize", () => render());

    // Handle mouse move for tooltip hit detection (on map, not canvas)
    map.on("mousemove", (e) => handleMapMouseMove(e));
    map.on("mouseleave", () => clearHoverRef.current?.());

    return () => {
      mapReadyRef.current = false;
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Load data on mount and pre-compute centroids for fast viewport culling
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setStatus("loading");
        const res = await fetch(`${BASE_PATH}data/score_map_hex.json`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!isMounted) return;

        // Pre-compute centroids and bounds for each feature (expensive operation done once)
        const featuresWithCentroids = (json.features ?? []).map((f) => {
          const centroid = d3.geoCentroid(f);
          const bounds = d3.geoBounds(f);
          return {
            ...f,
            _centroid: centroid, // Cache centroid for fast viewport culling
            _bounds: bounds, // Cache bounds for hover short-circuiting
          };
        });

        // Pre-compute global metric domains and color palettes (no per-frame extent)
        const domains = {};
        Object.keys(METRICS).forEach((key) => {
          const vals = featuresWithCentroids
            .map((f) => valueFor(f, key))
            .filter((v) => v !== null);
          const [min, max] = vals.length ? d3.extent(vals) : [0, 1];
          domains[key] = Number.isFinite(min) && Number.isFinite(max) && min !== max ? [min, max] : [0, 1];
        });

        const palettes = {};
        const interpolatorFor = (metric) => {
          if (metric === "local_temp_c") {
            // Blue for colder, red for hotter
            return (t) => d3.interpolateRdBu(1 - t);
          }
          if (metric === "elevation_m") {
            // Green for lower, red for higher
            return d3.interpolateRgbBasis(["#0e7c3a", "#f3c567", "#c62828"]);
          }
          return d3.interpolateRdYlGn;
        };

        Object.entries(domains).forEach(([key, dom]) => {
          const interp = interpolatorFor(key);
          const scale = d3.scaleSequential(dom, interp);
          const colors = Array.from({ length: 256 }, (_, i) => {
            const t = i / 255;
            const v = dom[0] + t * (dom[1] - dom[0]);
            return scale(v);
          });
          palettes[key] = colors;
        });

        featureCollectionRef.current = { ...json, features: featuresWithCentroids };
        metricDomainsRef.current = domains;
        palettesRef.current = palettes;
        setFeatures(featuresWithCentroids);
        setDomain(domains[defaultMetric] ?? [0, 1]);
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

  // Render when both map is ready AND features are loaded, or when metric changes
  useEffect(() => {
    if (!mapReady || !features.length) return;
    prevMetricRef.current = metric;
    metricRef.current = metric;
    const dom = metricDomainsRef.current[metric];
    if (dom) setDomain(dom);
    render();
  }, [metric, features, mapReady]);

  // Get only features visible in the current map viewport (uses pre-computed centroids)
  const getVisibleFeatures = (allFeatures, map) => {
    if (!map) return allFeatures;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // Add a small buffer to prevent popping at edges
    const buffer = 0.2;
    const minLng = sw.lng - buffer;
    const maxLng = ne.lng + buffer;
    const minLat = sw.lat - buffer;
    const maxLat = ne.lat + buffer;

    return allFeatures.filter((f) => {
      // Use pre-computed centroid for fast filtering
      const centroid = f._centroid;
      if (!centroid) return false;
      const [lon, lat] = centroid;
      return lon >= minLng && lon <= maxLng && lat >= minLat && lat <= maxLat;
    });
  };

  // Canvas-based render function - much faster than SVG for large datasets
  const render = () => {
    const allFeatures = featureCollectionRef.current?.features;
    if (!canvasRef.current || !allFeatures?.length) return;

    const canvas = canvasRef.current;
    const map = mapRef.current;
    if (!map || !mapContainerRef.current) return;

    // Mirror Mapbox canvas transform to avoid drift during pan/zoom
    const mapCanvas = map.getCanvas();
    if (mapCanvas && canvas.style.transform !== mapCanvas.style.transform) {
      canvas.style.transform = mapCanvas.style.transform;
    }
    canvas.style.transformOrigin = mapCanvas?.style.transformOrigin || "0 0";

    const width = mapContainerRef.current.clientWidth || 960;
    const height = mapContainerRef.current.clientHeight || 520;

    // Set canvas size (must set both attribute and style for HiDPI)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any previous scaling
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // D3 projection using Mapbox's project()
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

    // D3 path generator with canvas context
    const path = d3.geoPath(projection).context(ctx);

    // Get visible features and store for hit testing
    const visibleFeatures = getVisibleFeatures(allFeatures, map);
    visibleFeaturesRef.current = visibleFeatures;
    quadtreeRef.current = d3
      .quadtree()
      .x((d) => d[0])
      .y((d) => d[1])
      .addAll(
        visibleFeatures.map((f) => {
          const c = f._centroid ?? [0, 0];
          return [c[0], c[1], f];
        }),
      );

    // Use ref to get current metric (avoids stale closure in map event handlers)
    const currentMetric = metricRef.current;

    const metricDomain = metricDomainsRef.current[currentMetric] ?? [0, 1];
    const palette = palettesRef.current[currentMetric];

    // Draw each hex to canvas (this is still D3!)
    ctx.globalAlpha = 0.7;
    const drawSet = visibleFeatures;
    drawSet.forEach((f) => {
      ctx.beginPath();
      path(f);
      ctx.fillStyle = colorFor(f, currentMetric, palette, metricDomain);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.35;
      ctx.stroke();
    });

    // Highlight hovered hex if present and visible
    const hovered = hoveredFeatureRef.current;
    if (hovered) {
      const hoveredId = featureId(hovered);
      const match = visibleFeatures.find((f) => featureId(f) === hoveredId);
      if (match) {
        ctx.save();
        ctx.beginPath();
        path(match);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1.2;
        ctx.shadowColor = "rgba(0,255,128,0.45)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Update annotation positions to stay anchored on map
    ANNOTATIONS.forEach((ann) => {
      const el = annotationRefs.current[ann.id];
      if (!el) return;
      const projected = map.project(ann.coords);
      el.style.transform = `translate(${projected.x}px, ${projected.y}px)`;
    });
  };

  // Map mouse move handler for tooltip hit detection (uses Mapbox events)
  const handleMapMouseMove = (e) => {
    if (isPanningRef.current) {
      hideTooltip();
      return;
    }
    const lngLat = e.lngLat;

    // Prefer nearest-centroid candidate to limit geoContains checks
    const qt = quadtreeRef.current;
    let hoveredFeature = null;
    const nearest = qt?.find(lngLat.lng, lngLat.lat, 0.8);
    if (nearest?.[2]) {
      const candidate = nearest[2];
      if (d3.geoContains(candidate, [lngLat.lng, lngLat.lat])) {
        hoveredFeature = candidate;
      }
    }

    // Fallback: linear search over visible features (still bounded)
    if (!hoveredFeature) {
      hoveredFeature = visibleFeaturesRef.current.find((f) => {
        const b = f._bounds;
        if (b) {
          const [[minLon, minLat], [maxLon, maxLat]] = b;
          if (lngLat.lng < minLon || lngLat.lng > maxLon || lngLat.lat < minLat || lngLat.lat > maxLat) {
            return false;
          }
        }
        return d3.geoContains(f, [lngLat.lng, lngLat.lat]);
      });
    }

    if (hoveredFeature) {
      if (featureId(hoveredFeature) !== featureId(hoveredFeatureRef.current)) {
        hoveredFeatureRef.current = hoveredFeature;
        render();
      }
      // Create a synthetic event-like object for showTooltip
      const syntheticEvent = {
        clientX: e.point.x + (wrapperRef.current?.getBoundingClientRect().left ?? 0),
        clientY: e.point.y + (wrapperRef.current?.getBoundingClientRect().top ?? 0),
      };
      showTooltip(syntheticEvent, hoveredFeature, metricRef.current);
    } else {
      if (hoveredFeatureRef.current) {
        hoveredFeatureRef.current = null;
        render();
      }
      hideTooltip();
    }
  };

  const legendStops = useMemo(() => {
    const [min, max] = domain;
    const palette = palettesRef.current[metric] ?? null;
    return d3.range(0, 1.01, 0.1).map((t) => {
      const v = min + t * (max - min);
      if (palette && max !== min) {
        const idx = Math.max(0, Math.min(255, Math.floor(t * 255)));
        return { color: palette[idx], offset: Math.round(t * 100) };
      }
      const color = d3.interpolateRdYlGn(t);
      return { color, offset: Math.round(t * 100) };
    });
  }, [domain, metric]);

  // Ensure hover clears when leaving the wrapper (covers embedded contexts)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    const onLeave = () => clearHoverRef.current?.();
    wrapper.addEventListener("mouseleave", onLeave);
    const container = mapContainerRef.current;
    if (container) {
      container.addEventListener("mouseleave", onLeave);
    }
    return () => {
      wrapper.removeEventListener("mouseleave", onLeave);
      if (container) container.removeEventListener("mouseleave", onLeave);
    };
  }, []);

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
        {/* <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.35)]">
          Mapbox + D3 GridScore dashboard
        </div> */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            GridCast Score Map!
          </h1>
          <p className="max-w-4xl text-lg text-white/70">
            Interactive hex-grid visualization powered by D3 and Mapbox. Hover any cell to inspect profitability,
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
        </div>

        <div
          ref={wrapperRef}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a1320] via-[#08111d] to-[#0e1624] shadow-[0_30px_80px_rgba(0,0,0,0.35)] h-[70vh] min-h-[520px]"
        >
          <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />
          {metric === "dc_score" && (
            <div className="pointer-events-none absolute inset-0 z-10">
              {ANNOTATIONS.map((ann) => (
                <div
                  key={ann.id}
                  ref={(el) => {
                    if (el) annotationRefs.current[ann.id] = el;
                  }}
                  className="absolute"
                  style={{ transform: "translate(-9999px, -9999px)" }}
                >
                  <div
                    className="group pointer-events-auto flex items-center gap-2"
                    onMouseEnter={() => hideTooltip()}
                  >
                    <span
                      className={`h-3 w-3 rounded-full ${ann.colorClass} shadow-lg shadow-black/40 ring-2 ring-black/60 group-hover:scale-110 transition`}
                    />
                    <span className="pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 ease-out rounded-full border border-white/10 bg-black/80 px-3 py-1 text-xs text-white/85 shadow-lg backdrop-blur whitespace-nowrap">
                      {ann.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    tooltip.style("display", "none");
  }
}

function valueFor(feature, metric) {
  const v = feature?.properties?.[metric];
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function featureId(feature) {
  return feature?.id ?? feature?.properties?.hex_id ?? null;
}

function colorFor(feature, metric, palette, domain) {
  const v = valueFor(feature, metric);
  if (v === null || !palette || !domain) return "rgba(255,255,255,0.06)";
  const [min, max] = domain;
  if (max === min) return "rgba(255,255,255,0.06)";
  const t = (v - min) / (max - min);
  const idx = Math.max(0, Math.min(255, Math.floor(t * 255)));
  return palette[idx];
}

function formatValue(value, digits) {
  if (!Number.isFinite(value)) return "—";
  if (typeof digits === "number") {
    return d3.format(`.${digits}f`)(value);
  }
  return value.toString();
}

function legendGradient(stops) {
  return `linear-gradient(to right, ${stops.map((s) => `${s.color} ${s.offset}%`).join(",")})`;
}
