import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import quarterlyPueUrl from "@/assets/quarterly_pue.csv?url";

export default function PUEChart() {
  const chartRef = useRef(null);

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;

    async function draw() {
      const res = await fetch(quarterlyPueUrl);
      const text = await res.text();

      const data = d3.csvParse(text, d => {
        const year = +d.year;
        const qNum = +d.quarter.replace("Q", "");
        const PUE = +d.PUE;
        return {
          year,
          quarter: d.quarter,
          PUE,
          time: year + (qNum - 1) / 4, // numeric time for x-axis
        };
      });

      const { width: containerWidth } = container.getBoundingClientRect();
      const margin = { top: 32, right: 24, bottom: 40, left: 60 };
      const width = Math.max(containerWidth, 320) - margin.left - margin.right;
      const height = 240 - margin.top - margin.bottom;

      const svg = d3
        .select(container)
        .html("") // clear on re-render
        .append("svg")
        .attr(
          "viewBox",
          `0 0 ${width + margin.left + margin.right} ${
            height + margin.top + margin.bottom
          }`
        )
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleLinear()
        .domain(d3.extent(data, d => d.time))
        .range([0, width]);

      const y = d3
        .scaleLinear()
        .domain([
          d3.min(data, d => d.PUE) - 0.02,
          d3.max(data, d => d.PUE) + 0.02,
        ])
        .nice()
        .range([height, 0]);

      svg
        .append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

      svg.append("g").call(d3.axisLeft(y).ticks(5));

      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 8)
        .attr("fill", "#e5e5e5")
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text("Year");

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", -margin.left + 16)
        .attr("fill", "#e5e5e5")
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text("PUE");

      const line = d3
        .line()
        .x(d => x(d.time))
        .y(d => y(d.PUE));

      svg
        .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#4ade80")
        .attr("stroke-width", 2.5)
        .attr("d", line);

      svg
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.PUE))
        .attr("r", 3)
        .attr("fill", "#4ade80");
    }

    draw();
  }, []);

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto rounded-2xl bg-glass border border-white/10 p-4 sm:p-6 backdrop-blur-md">
      <h3 className="text-xl font-semibold text-white mb-2">
        Google Fleet-Wide Quarterly PUE
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        Each point shows Google&apos;s fleet PUE for a given quarter since 2015.
        Lower values mean more of the energy goes directly to computing instead
        of cooling and overhead.
      </p>
      <div ref={chartRef} className="w-full aspect-[16/9]" />
    </div>
  );
}
