import * as d3 from "d3";
import { useEffect, useRef } from "react";

export default function InternetUsageChart() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const csvUrl = new URL("../assets/internet_usage.csv", import.meta.url).href;

    d3.csv(csvUrl).then((dataRaw) => {
      if (!dataRaw || dataRaw.length === 0) return;

      const data = dataRaw.map((d) => ({
        year: +d.year,
        users: +d.global_internet_users_millions,
      }));

      // --- responsive sizing based on card width ---
      const { width: containerWidth } = container.getBoundingClientRect();
      const margin = { top: 32, right: 24, bottom: 50, left: 70 };
      const width = Math.max(containerWidth, 320) - margin.left - margin.right;
      const height = 240 - margin.top - margin.bottom;

      const rootSvg = d3
        .select(container)
        .html("") // clear previous render
        .append("svg")
        .attr(
          "viewBox",
          `0 0 ${width + margin.left + margin.right} ${
            height + margin.top + margin.bottom
          }`
        )
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

      const svg = rootSvg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const innerWidth = width;
      const innerHeight = height;

      const x = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.year))
        .range([0, innerWidth]);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.users)])
        .nice()
        .range([innerHeight, 0]);

      const xAxis = d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6);
      const yAxis = d3.axisLeft(y).ticks(6);

      const xAxisGroup = svg
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis);

      const yAxisGroup = svg.append("g").call(yAxis);

      xAxisGroup.selectAll("path, line").attr("stroke", "#e5e5e5");
      yAxisGroup.selectAll("path, line").attr("stroke", "#e5e5e5");
      xAxisGroup.selectAll("text").attr("fill", "#e5e5e5");
      yAxisGroup.selectAll("text").attr("fill", "#e5e5e5");

      // axis labels
      rootSvg
        .append("text")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", margin.top + innerHeight + 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#e5e5e5")
        .attr("font-size", 12)
        .text("Year");

      rootSvg
        .append("text")
        .attr(
          "transform",
          `translate(${20}, ${margin.top + innerHeight / 2}) rotate(-90)`
        )
        .attr("text-anchor", "middle")
        .attr("fill", "#e5e5e5")
        .attr("font-size", 12)
        .text("Global Internet Users (millions)");

      const line = d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.users));

      svg
        .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#4ade80")
        .attr("stroke-width", 3)
        .attr("d", line);

      svg
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.users))
        .attr("r", 4)
        .attr("fill", "#22c55e");
    });
  }, []);

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto rounded-2xl bg-glass border border-white/10 p-4 sm:p-6 backdrop-blur-md">
      <h3 className="text-xl font-semibold text-white mb-2">
        Global Internet Users Over Time (Millions)
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        As more people come online, the demand for cloud services and data
        centers grows, driving up the infrastructure needed to support the
        modern internet.
      </p>
      <div ref={containerRef} className="w-full aspect-[16/9]" />
    </div>
  );
}