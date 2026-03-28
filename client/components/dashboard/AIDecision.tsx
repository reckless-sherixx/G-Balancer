"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TextPlugin } from "gsap/TextPlugin";
import { Sparkles, Cpu } from "lucide-react";
import { useGridStore } from "@/hooks/useGridData";

if (typeof window !== "undefined") {
  gsap.registerPlugin(TextPlugin, useGSAP);
}

export function AIDecision() {
  const container = useRef<HTMLDivElement>(null);
  const metrics = useGridStore((state) => state.metrics);
  const weather = useGridStore((state) => state.weather);
  const stats = useGridStore((state) => state.stats);
  
  useGSAP(() => {
    const demand = metrics?.currentDemand ?? 0;
    const supply = metrics?.totalSupply ?? 0;
    const renewablePct = stats?.renewablePercentage ?? 0;

    const decisions = [
      `Action: ${(metrics?.recommendedAction ?? "no_action").replace(/_/g, " ")}`,
      metrics?.actionDescription ?? "No action required.",
      `Demand ${demand.toFixed(1)} MW | Supply ${supply.toFixed(1)} MW`,
      `Renewables share ${renewablePct.toFixed(1)}%`,
      `Weather ${weather?.temperatureC?.toFixed(1) ?? "0.0"}C, Wind ${weather?.windSpeedKmh?.toFixed(1) ?? "0.0"} km/h`,
      `Grid status ${metrics?.gridStatus ?? "normal"}`,
      "Telemetry synchronized with backend."
    ];

    const tl = gsap.timeline({ repeat: -1 });

    decisions.forEach((decision) => {
      // Type new string
      tl.to(".ai-text", {
        duration: 2.6,
        text: decision,
        ease: "none"
      }, "+=0.4")
      // Hold reading time
      .to(".ai-text", { duration: 2.2 })
      // Blink cursor rapidly to simulate processing
      .to(".ai-cursor", { opacity: 0, duration: 0.15, yoyo: true, repeat: 5 })
      // Clear out text
      .to(".ai-text", { text: "", duration: 0.45 });
    });
  }, { scope: container, dependencies: [metrics, weather, stats] });

  return (
    <div ref={container} className="bg-[#141414] border border-[#222] p-6 lg:p-8 flex flex-col justify-between h-[250px] relative overflow-hidden group hover:border-[#333]">
       <div className="absolute top-0 right-0 w-[50%] h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(0,255,135,0.05),_transparent)] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100"></div>
       
       <div className="flex justify-between items-start text-white/50 mb-4 z-10">
         <span className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-[#00ff87]">Cognition Engine</span>
         <Cpu className="w-5 h-5 text-[#00ff87] opacity-80" />
       </div>

       <div className="flex-1 flex flex-col justify-center">
         <div className="font-mono text-base md:text-lg lg:text-xl text-white/90 leading-tight">
             <span className="text-[#00ff87] mr-3 font-bold">&gt;</span>
             <span className="ai-text">Initialize inference module...</span>
             <span className="ai-cursor inline-block w-2 bg-[#00ff87] ml-1 shadow-[0_0_8px_#00ff87]">&nbsp;</span>
         </div>
       </div>

       <div className="flex justify-between items-end border-t border-[#333] pt-4 mt-6 text-white/30 font-mono text-[10px] uppercase tracking-widest">
           <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-[#00ff87]"/> G-NODE V4</span>
           <span>Latency: 4ms</span>
       </div>
    </div>
  );
}
