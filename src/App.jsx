import * as d3 from "d3";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Dither from "@/components/Dither";
import Navbar from "@/components/Navbar";
import D3ScoreMapPage from "@/pages/D3ScoreMapPage";
import InternetUsageChart from "@/components/InternetUsageChart";
import PUEChart from "@/components/PUEChart";




import usDataCsvUrl from "../archive/Book1.csv?url";


const sections = [
  {
    id: "datacenters",
    title: "What Are Data Centers?",
    text: `Every search, every AI query, every cloud upload — they all run through datacenters. These massive facilities house thousands of servers that process, store, and transmit data around the clock.
In essence, datacenters are the factories of the digital world — and in the age of AI they have become even more important.`,
    background: "/dsc-106-final-proj/images/datacenter-bg.jpg",
    showInternetChart: true,
  },
  {
    id: "us-types",
    title: "Top U.S. Data Center Types",
    text: `In the United States, not all data centers are built the same. Hyperscale sites power large cloud platforms, while colocation, enterprise, government, and edge facilities serve different industries and workloads.
To understand their reliability, we look at how each type is distributed across the Uptime Institute tier system (Tier I–IV), where higher tiers correspond to more redundancy and higher expected uptime.`,
    background: "/dsc-106-final-proj/images/datacenter-bg.jpg",
    showUSTypeTierChart: true,
  },
  {
    id: "future",
    title: "Energy Concerns of Data Centers",
    text: `Artificial intelligence is revolutionizing every industry from healthcare to finance, and its growth shows no signs of slowing. 
    But behind every query and every AI model training session lies massive computational infrastructure. Data centers currently consume 1-2% of global electricity, and with AI's explosive growth, that number is skyrocketing.The energy used to power these data centers must be monitored and optimized to fit our needs as businesses and as people. As AI becomes more integrated into our daily lives, we're facing a critical question: how do we fuel this technological revolution without accelerating the climate crisis?
`,
    background: "/dsc-106-final-proj/images/coal-bg.jpg",
    
  },
  {
    id: "energy",
    title: "The Solution: Sustainable Data Centers",
    text: `Sustainable data centers are facilities designed to minimize environmental impact while maintaining high computing performance. These facilities achieve efficiency through renewable energy sources, optimized cooling systems with low PUE ratings, and water conservation techniques. The best sustainable data centers can operate on 100% renewable energy with PUE scores below 1.15, compared to the industry average of 1.58.`,
    background: "/dsc-106-final-proj/images/sustainable_datacenter.jpg",
    showPUEChart: true, 
  },
  {
    id: "score",
    title: "Introducing the Datacenter Score",
    text: `or GridScore.

To measure the concerns of this growing industry, we developed GridScore. A comprehensive dual-framework, it evaluates data centers on both ESG performance and profitability using a 60/40 weighting system. The ESG component (60%) measures environmental factors like energy efficiency and renewable usage. 
The profitability component (40%) assesses operational efficiency, and computation per energy used, ensuring that sustainable facilities are also financially viable.`,
    background: "/dsc-106-final-proj/images/scoring_breakdown.png",
  },
  {
    id: "gridcast",
    title: "What Is GridCast?",
    text: `Our mission is to use data to provide this information on how and where to build the perfect data center. We believe there is a smarter and better way to ride the wave of AI without harming the planet in the process.
    
    Welcome to GridCast.`,
    background: "/dsc-106-final-proj/images/hex-gr-bg.avif",
    showLaunchButton: true,
  },
];

export default function App() {
  const basePath = import.meta.env.BASE_URL ?? "/";

  const getRoute = () => {
    if (typeof window === "undefined") return "home";
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.includes("dashboard") || hash.includes("dashboard")) return "dashboard";
    if (path.includes("contact") || hash.includes("contact")) return "contact";
    return "home";
  };

  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  if (route === "dashboard") {
    return <D3ScoreMapPage />;
  }
  if (route === "contact") {
    return <ContactPage />;
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-dark-bg text-white">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative isolate z-10 flex min-h-[100vh] w-full flex-col items-center px-4 pb-32">
        <div className="absolute top-0 left-0 right-0 -bottom-31 -z-10">
          <Dither
            className="pointer-events-none h-full w-full"
            waveColor={[0.5, 0.7, 0.5]}
            disableAnimation={false}
            enableMouseInteraction={false}
            mouseRadius={0.3}
            colorNum={6.7}
            waveAmplitude={0}
            waveFrequency={0}
            waveSpeed={0.01}
          />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-dark-bg pointer-events-none" />
        </div>

        <div className="relative z-10 flex w-full max-w-5xl flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-5xl sm:text-8xl font-bold tracking-tighter text-white drop-shadow-[0_0_30px_rgba(0,255,128,0.3)] mt-36">
            ⚡️GridCast
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80 sm:text-xl">
            Forecasting the energy of tomorrow, today.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <a
              href={`${basePath}dashboard`}
              className="px-10 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,128,0.4)]"
            >
              Launch Dashboard
            </a>
            <span className="text-white/40 italic font-serif text-lg">or</span>
            <a
              href="https://www.youtube.com/watch?v=vOQEVUWjUXY"
              className="px-10 py-4 rounded-full border border-white/20 bg-glass text-white font-medium hover:bg-white/10 hover:border-neon/50 transition-all backdrop-blur-sm cursor-pointer"
            >
              Watch the Video
            </a>
          </div>
        </div>

        <div className="relative z-10 mt-12 w-full max-w-5xl text-center">
          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
            <FeatureCard
              title="A sustainable future"
              text="The importance of sustainable data centers in the age of AI and cloud computing."
              href="#energy"
            />
            <FeatureCard
              title="Geographic Insights"
              text="An interactive map that reveal how grid conditions vary across regions, making large-scale energy patterns easy to understand."
              href="#page-bottom"
            />
            <FeatureCard
              title="GridScore Explained"
              text="Balance profitability and sustainability with our datacenter and ESG scoring models."
              href="#score"
            />
          </div>
        </div>
      </section>

      {/* Presentation Narrative Sections */}
      <div className="w-full flex flex-col gap-0">
        {sections.map((section, i) =>
          section.id === "gridcast" ? (
            <FullScreenSection key={section.id} {...section} basePath={basePath} />
          ) : (
            <SplitSection key={section.id} {...section} index={i} basePath={basePath} />
          )
        )}
      </div>
      <div id="page-bottom" className="h-px w-full" />
    </main>
  );
}

function ContactPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-dark-bg text-white">
      <section className="relative isolate z-10 flex min-h-screen w-full items-center px-6 py-24">
        <div className="absolute inset-0 -z-10">
          <Dither
            className="pointer-events-none h-full w-full"
            waveColor={[0.5, 0.7, 0.5]}
            disableAnimation={false}
            enableMouseInteraction={false}
            mouseRadius={0.3}
            colorNum={6.7}
            waveAmplitude={0}
            waveFrequency={0}
            waveSpeed={0.01}
          />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-dark-bg pointer-events-none" />
        </div>

        <div className="relative z-10 w-full max-w-7xl">
          <div className="grid gap-12 md:grid-cols-[2fr_0.8fr] md:items-center">
            <div className="flex flex-col gap-4 items-center text-center">
              <h1 className="text-5xl sm:text-8xl font-bold tracking-tighter text-white drop-shadow-[0_0_30px_rgba(0,255,128,0.3)]">
                ⚡️GridCast
              </h1>
              <p className="max-w-2xl text-lg text-white/80 sm:text-xl">
                Forecasting the energy of tomorrow, today.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/60 backdrop-blur-sm">
                <img
                  src="/dsc-106-final-proj/images/qr.png"
                  alt="Contact QR Code"
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <a
                href="#"
                className="text-3xl text-neon hover:text-white transition-colors underline decoration-neon/50 decoration-2 underline-offset-4"
              >
                n3il-kb.github.io/dsc-106-final-proj/
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, text, href }) {
  const Content = (
    <>
      <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-neon transition-colors">
        {title}
      </h3>
      <p className="text-white/60 leading-relaxed">{text}</p>
    </>
  );

  const className =
    "group block h-full rounded-2xl bg-glass border border-white/10 p-8 backdrop-blur-md text-center hover:border-neon/50 hover:shadow-[0_0_30px_rgba(0,255,128,0.1)] transition-all duration-500 cursor-pointer";

  if (href) {
    return (
      <a href={href} className={className}>
        {Content}
      </a>
    );
  }

  return <div className={className}>{Content}</div>;
}

/* helper: parse numeric cells like "300+", "~2,000+" etc. */
function parseNumericCell(cell) {
  if (!cell) return 0;
  const cleaned = cell.toString().replace(/[^0-9.]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

/* NEW: read USA from CSV and show top 5 datacenter types vs tiers */
function USDataCenterTypeTierChart() {
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(usDataCsvUrl);
        const text = await res.text();
        const rows = d3.csvParse(text);

        const usaRow = rows.find((row) => row.country === "United States");
        if (!usaRow) {
          setError("United States row not found in CSV.");
          return;
        }

        const total = Number(usaRow.total_data_centers);
        const hyperscale = parseNumericCell(usaRow.hyperscale_data_centers);
        const colocation = parseNumericCell(usaRow.colocation_data_centers);
        const remaining = total - hyperscale - colocation;

        const enterprise = Math.round(remaining * 0.4);
        const government = Math.round(remaining * 0.35);
        const edge = total - hyperscale - colocation - enterprise - government;

        const tierCell = usaRow.tier_distribution || "";
        const tierPercents = {};
        tierCell.split(",").forEach((part) => {
          const m = part.trim().match(/([IVX]+)\s*:? *([\d.]+)%/);
          if (m) {
            tierPercents[m[1]] = Number(m[2]);
          }
        });

        const types = [
          { name: "Hyperscale", count: hyperscale },
          { name: "Colocation", count: colocation },
          { name: "Enterprise", count: enterprise },
          { name: "Government", count: government },
          { name: "Edge/Other", count: edge },
        ];

        const tiers = ["I", "II", "III", "IV"];

        const maxCount = Math.max(
          ...types.flatMap((t) =>
            tiers.map(
              (tier) => (t.count * (tierPercents[tier] ?? 0)) / 100
            )
          )
        );

        setChartData({ types, tiers, tierPercents, maxCount });
      } catch (e) {
        console.error(e);
        setError("Failed to load CSV.");
      }
    }

    load();
  }, []);

  if (error) {
    return (
      <p className="mt-4 text-sm text-red-400">
        {error}
      </p>
    );
  }

  if (!chartData) {
    return (
      <p className="mt-4 text-sm text-gray-400">
        Loading U.S. datacenter types…
      </p>
    );
  }

  const { types, tiers, tierPercents, maxCount } = chartData;

  const tierColors = {
    I: "#38bdf8",      // sky-400
    II: "#34d399",     // emerald-400
    III: "#facc15",    // yellow-400
    IV: "#f87171",     // red-400
  };

  // SVG layout
  const viewBoxWidth = 420;
  const viewBoxHeight = 260;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const plotWidth = viewBoxWidth - paddingLeft - paddingRight;
  const plotHeight = viewBoxHeight - paddingTop - paddingBottom;

  const typeBand = plotWidth / types.length;
  const tierBand = typeBand / (tiers.length + 1);

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto rounded-2xl bg-glass border border-white/10 p-4 sm:p-6 backdrop-blur-md">
      <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
        U.S. Data Center Types by Tier
      </h3>
      <p className="text-sm sm:text-base text-gray-400 mb-4">
        For each major U.S. data center type, the grouped bars show the
        estimated number of facilities in Tier I–IV. Higher tiers correspond to
        more redundancy and higher expected uptime.
      </p>

      {/* SVG chart */}
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-auto"
      >
        {/* x-axis line */}
        <line
          x1={paddingLeft}
          y1={viewBoxHeight - paddingBottom}
          x2={viewBoxWidth - paddingRight}
          y2={viewBoxHeight - paddingBottom}
          stroke="#e5e5e5"
          strokeWidth={1}
        />

        {/* Bars */}
        {types.map((type, i) => {
          const baseX = paddingLeft + i * typeBand;

          return tiers.map((tier, j) => {
            const value =
              (type.count * (tierPercents[tier] ?? 0)) / 100;
            const barHeight =
              maxCount > 0 ? (value / maxCount) * plotHeight : 0;

            const x =
              baseX + j * tierBand + tierBand * 0.1;
            const y =
              viewBoxHeight - paddingBottom - barHeight;
            const barWidth = tierBand * 0.8;

            return (
              <rect
                key={`${type.name}-${tier}`}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={tierColors[tier]}
              >
                <title>
                  {`${type.name} – Tier ${tier}: ${value.toFixed(
                    0
                  )} data centers (approx.)`}
                </title>
              </rect>
            );
          });
        })}

        {/* Type labels */}
        {types.map((type, i) => {
          const centerX =
            paddingLeft + i * typeBand + typeBand / 2;
          const labelY = viewBoxHeight - paddingBottom + 20;

          return (
            <text
              key={type.name}
              x={centerX}
              y={labelY}
              textAnchor="middle"
              fill="#e5e5e5"
              fontSize={10}
            >
              {type.name}
            </text>
          );
        })}

        {/* y-axis tick line (just 0 and max for now) */}
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={viewBoxHeight - paddingBottom}
          stroke="#e5e5e5"
          strokeWidth={1}
        />
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-300">
        {tiers.map((tier) => (
          <div key={tier} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: tierColors[tier] }}
            />
            <span>Tier {tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


function SplitSection({
  id,
  title,
  text,
  background,
  showLaunchButton,
  index,
  showInternetChart,
  showUSTypeTierChart,
  showPUEChart,
  basePath,
}) {
  const isEven = index % 2 === 0;

  return (
    <section
      id={id}
      className="relative z-20 flex min-h-[80vh] w-full items-center justify-center overflow-hidden px-6 py-24 md:px-24"
    >
      <div className="container mx-auto grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-24 items-center">
        {/* Text Column */}
        <motion.div
          className={`flex flex-col justify-center ${
            isEven ? "md:order-1" : "md:order-2"
          }`}
          initial={{ opacity: 0, x: isEven ? -50 : 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl leading-tight">
            {title}
          </h2>
          <p className="whitespace-pre-line text-lg leading-relaxed text-gray-400 md:text-xl">
            {text}
          </p>

          {showInternetChart && (
            <div className="mt-8">
              <InternetUsageChart />
            </div>
          )}

          {showUSTypeTierChart && <USDataCenterTypeTierChart />}

          {showPUEChart && <PUEChart />}

          {showLaunchButton && (
            <div className="mt-10">
              <a
                href={`${basePath}dashboard`}
                className="inline-block px-8 py-3 rounded-full bg-white text-black font-bold text-lg hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,128,0.4)]"
              >
                Launch Dashboard
              </a>
            </div>
          )}
        </motion.div>

        {/* Image Card Column */}
        <motion.div
          className={`relative ${isEven ? "md:order-2" : "md:order-1"}`}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
            <div className="aspect-[4/3] w-full overflow-hidden">
              <img
                src={background}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FullScreenSection({ title, text, background, showLaunchButton, basePath }) {
  return (
    <section className="relative isolate flex h-screen items-center justify-center overflow-hidden px-6 text-center md:px-24">
      {background ? (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${background})` }}
          initial={{ scale: 1.05, opacity: 0.6 }}
          whileInView={{ scale: 1, opacity: 0.95 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          viewport={{ once: true }}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-black" aria-hidden="true" />
      )}

      <motion.div
        className="absolute inset-0 z-20 bg-gradient-to-b from-black/15 via-black/45 to-black/85 backdrop-blur-[1px]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      />

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        viewport={{ once: true }}
        className="z-30 max-w-3xl"
      >
        <h2 className="mb-6 text-5xl font-bold text-white drop-shadow-[0_0_20px_rgba(0,255,128,0.25)] md:text-7xl tracking-tight">
          {title}
        </h2>
        <p className="whitespace-pre-line text-lg leading-relaxed text-gray-200 md:text-xl">
          {text}
        </p>
        {showLaunchButton && (
          <div className="mt-10 flex justify-center">
            <a
              href={`${basePath}dashboard`}
              className="px-10 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,128,0.4)]"
            >
              Launch Dashboard
            </a>
          </div>
        )}
      </motion.div>
    </section>
  );
}
