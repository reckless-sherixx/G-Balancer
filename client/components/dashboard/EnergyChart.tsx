"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useGridStore } from "@/hooks/useGridData";

type ChartPoint = { x: number; y: number };

function toCurvePath(points: ChartPoint[]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cx1 = p0.x + (p1.x - p0.x) / 3;
    const cx2 = p0.x + ((p1.x - p0.x) * 2) / 3;
    path += ` C ${cx1} ${p0.y}, ${cx2} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return path;
}

export function EnergyChart() {
  const container = useRef<HTMLDivElement>(null);
  const forecast = useGridStore((state) => state.forecast);

  const points = (forecast?.points ?? []).slice(0, 8);
  const demandValues = points.map((point) => point.demand);
  const supplyValues = points.map((point) => point.supply);
  const maxValue = Math.max(1, ...demandValues, ...supplyValues);

  const fallbackDemandPath = "M 0 55 C 20 50, 30 70, 50 60 C 70 50, 80 80, 100 65";
  const fallbackSupplyPath = "M 0 45 C 20 40, 30 65, 50 45 C 70 25, 80 30, 100 15";

  const demandPath = points.length
    ? toCurvePath(points.map((point, index) => ({
        x: points.length === 1 ? 0 : (index / (points.length - 1)) * 100,
        y: 90 - (point.demand / maxValue) * 75,
      })))
    : fallbackDemandPath;

  const supplyPath = points.length
    ? toCurvePath(points.map((point, index) => ({
        x: points.length === 1 ? 0 : (index / (points.length - 1)) * 100,
        y: 90 - (point.supply / maxValue) * 75,
      })))
    : fallbackSupplyPath;

  const fillPath = `${supplyPath} L 100 100 L 0 100 Z`;
  
  useGSAP(() => {
    // Animate the line drawing in
    gsap.fromTo(".chart-line", 
      { strokeDasharray: 300, strokeDashoffset: 300 },
      { strokeDashoffset: 0, duration: 2.5, ease: "power2.inOut" }
    );
    gsap.fromTo(".chart-line-demand", 
      { strokeDasharray: 300, strokeDashoffset: 300 },
      { strokeDashoffset: 0, duration: 2.5, ease: "power2.inOut", delay: 0.3 }
    );
    gsap.fromTo(".chart-fill", 
      { opacity: 0, y: 50 },
      { opacity: 0.2, y: 0, duration: 2, ease: "power2.out", delay: 1 }
    );
  }, { scope: container, dependencies: [demandPath, supplyPath] });

  return (
    <div ref={container} className="bg-[#141414] border border-[#222] p-6 lg:p-8 flex flex-col h-[400px] relative overflow-hidden group hover:border-[#333] transition-colors">
      <div className="flex justify-between items-center mb-10 relative z-10">
        <h3 className="font-bebas text-3xl tracking-wide text-white">Supply vs Demand Array</h3>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#00ff87] shadow-[0_0_5px_#00ff87]"></span>
            <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest">Supply</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-white/30"></span>
            <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest">Demand</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 w-full relative border-l border-b border-[#333] ml-4 mb-2">
        {/* Simple SVG Chart */}
        <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#333" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#333" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#333" strokeWidth="0.5" strokeDasharray="2" />

          {/* Demand Line */}
          <path 
            className="chart-line-demand"
            d={demandPath}
            fill="none" 
            stroke="rgba(255,255,255,0.3)" 
            strokeWidth="2" 
            vectorEffect="non-scaling-stroke"
          />

          {/* Supply Line */}
          <path 
            className="chart-line"
            d={supplyPath}
            fill="none" 
            stroke="#00ff87" 
            strokeWidth="3" 
            vectorEffect="non-scaling-stroke"
            style={{ filter: "drop-shadow(0px 4px 10px rgba(0, 255, 135, 0.4))" }}
          />

          {/* Fill under supply */}
          <path 
            className="chart-fill"
            d={fillPath}
            fill="url(#supplyGradient)" 
            opacity="0.2"
          />
          <defs>
            <linearGradient id="supplyGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00ff87" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>

        {/* Axis Labels */}
        <div className="absolute left-[-28px] top-[-6px] font-mono text-[9px] text-white/30">MAX</div>
        <div className="absolute left-[-28px] bottom-[-6px] font-mono text-[9px] text-white/30">MIN</div>
      </div>
    </div>
  );
}
