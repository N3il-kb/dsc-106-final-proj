import * as d3 from "d3";
import { useEffect, useRef } from "react";

export default function InternetUsageChart() {
  const ref = useRef();

  useEffect(() => {
    // Vite-friendly way to reference a CSV in src/assets
    const csvUrl = new URL("../assets/internet_usage.csv", import.meta.url).href;
    console.log("Loading CSV from:", csvUrl);

    d3.csv(csvUrl).then((data) => {
      console.log("Loaded data:", data);

      // If somehow it's empty, just bail early
      if (!data || data.length === 0) return;

      data.forEach((d) => {
        d.year = +d.year;
        d.global_internet_users_millions = +d.global_internet_users_millions;
      });

      const svg = d3.select(ref.current);
      const width = 600;
      const height = 350;
      const margin = { top: 30, right: 20, bottom: 50, left: 80 };

      svg.selectAll("*").remove();
      svg.attr("width", width).attr("height", height);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.year))
        .range([0, innerWidth]);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.global_internet_users_millions)])
        .nice()
        .range([innerHeight, 0]);

      const xAxis = d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6);
      const yAxis = d3.axisLeft(y).ticks(6);

      const xAxisGroup = g
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis);

      const yAxisGroup = g.append("g").call(yAxis);

      xAxisGroup.selectAll("path, line").attr("stroke", "#e5e5e5");
      yAxisGroup.selectAll("path, line").attr("stroke", "#e5e5e5");
      xAxisGroup.selectAll("text").attr("fill", "#e5e5e5");
      yAxisGroup.selectAll("text").attr("fill", "#e5e5e5");

      svg
        .append("text")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "#e5e5e5")
        .attr("font-size", 12)
        .text("Year");

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerHeight / 2))
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#e5e5e5")
        .attr("font-size", 12)
        .text("Global Internet Users (millions)");

      const line = d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.global_internet_users_millions))
        .defined(
          (d) =>
            !isNaN(d.year) && !isNaN(d.global_internet_users_millions)
        );

      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#4ade80")
        .attr("stroke-width", 3)
        .attr("d", line);

      g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.global_internet_users_millions))
        .attr("r", 4)
        .attr("fill", "#22c55e");
    });
  }, []);

  return (
    <div className="mt-4 p-1">
      <h3 className="mb-2 text-left text-sm font-semibold text-white/70">
        Global Internet Users Over Time (Millions)
      </h3>
      <svg ref={ref} />
    </div>
  );
}
