import { motion } from "framer-motion";
import Dither from "@/components/Dither";
import Navbar from "@/components/Navbar";

const sections = [
  {
    id: "datacenters",
    title: "What Are Datacenters?",
    text: `Every search, every AI query, every cloud upload — they all run through datacenters.
These massive facilities house thousands of servers that process, store, and transmit data around the clock.
In essence, datacenters are the factories of the digital era — the invisible engines powering everything from Netflix to GPT.`,
  },
  {
    id: "future",
    title: "Why Datacenters Matter for the Future — and AI",
    text: `The future of AI depends on compute — and compute lives in datacenters.
Every AI model, from ChatGPT to diffusion image generators, consumes immense processing power.
As models scale, so does the demand for electricity, cooling, and physical infrastructure.
By 2030, AI workloads could account for up to 10% of global electricity demand.`,
  },
  {
    id: "energy",
    title: "Why They Use So Much Energy",
    text: `Datacenters must stay online 24/7. Servers generate heat, which demands powerful cooling systems.
Electricity keeps everything running — from GPUs crunching numbers to chillers keeping them alive.
The result: a constant tug-of-war between performance and sustainability.`,
  },
  {
    id: "score",
    title: "Introducing the Datacenter Score",
    text: `Not all datacenters are created equal.
GridCast introduces the Datacenter Score — a composite metric that measures both profitability and sustainability.
It combines local energy costs, renewable energy share, and regional efficiency to give a clear, data-driven rating of each site.`,
  },
  {
    id: "sustainability",
    title: "Sustainability and Custom Scores",
    text: `Every company can define its own sustainability priorities — whether minimizing carbon footprint, maximizing uptime, or balancing both.
GridCast allows you to create a Custom Sustainability Score, blending renewable energy intensity, carbon cost, and operational metrics unique to your datacenter.`,
  },
  {
    id: "gridcast",
    title: "What Is GridCast?",
    text: `GridCast is an intelligent forecasting and analytics platform for the data-driven energy era.
We predict energy demand, score datacenter sustainability, and visualize grid efficiency across regions — helping businesses make smarter, greener infrastructure decisions.
Whether you’re an AI company siting your next facility or an analyst evaluating carbon impact, GridCast bridges the gap between performance and planet.`,
  },
];

export default function App() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-black text-white">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative isolate z-10 flex min-h-[100vh] w-full flex-col items-center overflow-hidden px-4 pb-10">
        <div className="absolute inset-0 -z-10">
          <Dither
            className="pointer-events-none"
            waveColor={[0.5, 0.7, 0.5]}
            disableAnimation={false}
            enableMouseInteraction={false}
            mouseRadius={0.3}
            colorNum={6.7}
            waveAmplitude={0}
            waveFrequency={0}
            waveSpeed={0.01}
          />
        </div>

        <div className="relative z-10 flex w-full max-w-5xl flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white drop-shadow-[0_0_15px_rgba(0,255,128,0.25)] mt-36">
            ⚡️GridCast
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80 sm:text-xl">
            Forecasting the energy of tomorrow, today.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button className="px-8 py-3 rounded-full border border-white/60 bg-white text-black font-semibold hover:bg-green-400/20 hover:text-white transition-all">
              Launch Dashboard
            </button>
            <button className="px-8 py-3 rounded-full border border-white/20 bg-white/5 text-white/80 font-medium hover:bg-white/10 transition-all">
              Learn More
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-12 w-full max-w-6xl text-center">
          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
            <FeatureCard
              title="Real-Time Insights"
              text="Live data visualizations of regional and national energy grids to stay ahead of market shifts."
            />
            <FeatureCard
              title="AI Forecasting"
              text="Powered by advanced ARIMA + neural hybrid models for accurate energy demand predictions."
            />
            <FeatureCard
              title="Sustainability Index"
              text="Balance profitability and sustainability with our datacenter and ESG scoring models."
            />
          </div>
        </div>
      </section>

      {/* Presentation Narrative Sections */}
      <div className="w-full">
        {sections.map((section, i) => (
          <FullScreenSection key={section.id} {...section} />
        ))}
      </div>
    </main>
  );
}

function FeatureCard({ title, text }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md text-center hover:bg-white/10 transition">
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/70">{text}</p>
    </div>
  );
}

function FullScreenSection({ title, text }) {
  return (
    <section className="flex items-center justify-center h-screen px-6 md:px-24 text-center relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        viewport={{ once: true }}
        className="max-w-3xl z-10"
      >
        <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white drop-shadow-[0_0_20px_rgba(0,255,128,0.25)]">
          {title}
        </h2>
        <p className="text-lg md:text-xl leading-relaxed text-gray-300 whitespace-pre-line">
          {text}
        </p>
      </motion.div>

      {/* Soft gradient overlay */}
      <motion.div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-black opacity-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.5 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true }}
      />

      {/* Floating color mist effect */}
      <motion.div
        className="absolute w-[120%] h-[120%] -z-20 blur-3xl bg-gradient-to-tr from-green-400/10 via-blue-500/10 to-purple-600/10 animate-pulse"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </section>
  );
}
