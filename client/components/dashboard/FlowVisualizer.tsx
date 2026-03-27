"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CloudLightning, Cpu, Zap, Activity } from "lucide-react";

export function FlowVisualizer() {
  const container = useRef<HTMLDivElement>(null);
  
  useGSAP(() => {
    // Left-to-right particle 1
    gsap.to(".flow-p1", {
        keyframes: {
            "0%": { left: "0%", opacity: 0 },
            "50%": { opacity: 1 },
            "100%": { left: "100%", opacity: 0 }
        },
        duration: 1.5,
        repeat: -1,
        ease: "none",
    });

    // Left-to-right particle 2
    gsap.to(".flow-p2", {
        keyframes: {
            "0%": { left: "0%", opacity: 0 },
            "50%": { opacity: 1 },
            "100%": { left: "100%", opacity: 0 }
        },
        duration: 1.8,
        repeat: -1,
        ease: "none",
        delay: 0.5
    });

    // Core pulsing logic
    gsap.to(".node-pulse", {
        scale: 1.4,
        opacity: 0,
        duration: 1.5,
        repeat: -1,
        ease: "power2.out"
    });
  }, { scope: container });

  const nodes = [
    { id: "A", icon: <CloudLightning className="w-5 h-5 text-white/70" />, label: "METEO" },
    { id: "B", icon: <Cpu className="w-6 h-6 text-[#00ff87]" />, label: "CORE" },
    { id: "C", icon: <Zap className="w-5 h-5 text-white/70" />, label: "GRID" },
    { id: "D", icon: <Activity className="w-5 h-5 text-amber-500" />, label: "NODE" }
  ];

  return (
    <div ref={container} className="bg-[#141414] border border-[#222] p-6 lg:p-8 flex flex-col justify-between h-[250px] relative overflow-hidden group hover:border-[#333] transition-colors">
        <h3 className="font-bebas text-2xl tracking-wide text-white mb-auto relative z-10">Live Telemetry Routing</h3>
        
        <div className="flex items-center w-full relative z-10 my-auto pb-4 px-2">
            {nodes.map((n, i) => (
                <div key={n.id} className="relative flex items-center justify-center flex-1">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border border-[#444] bg-[#0A0A0A] flex justify-center items-center relative z-20 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                        {i === 1 && <div className="node-pulse absolute inset-0 rounded-full border border-[#00ff87]"></div>}
                        {n.icon}
                        <span className="absolute -bottom-6 font-mono text-[9px] md:text-[10px] text-white/50 tracking-widest">{n.label}</span>
                    </div>
                </div>
            ))}
            {/* Connection Lines (absolute behind nodes) */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#333] -translate-y-1/2 z-0 pb-4">
               {/* 3 Segments */}
               <div className="absolute left-[15%] w-[25%] h-full">
                  <div className="flow-p1 absolute top-1/2 -translate-y-1/2 w-4 h-[2px] bg-white shadow-[0_0_8px_#fff]"></div>
               </div>
               <div className="absolute left-[45%] w-[25%] h-full">
                  <div className="flow-p2 absolute top-1/2 -translate-y-1/2 w-4 h-[2px] bg-[#00ff87] shadow-[0_0_8px_#00ff87]"></div>
               </div>
               <div className="absolute left-[75%] w-[15%] h-full">
                  <div className="flow-p1 absolute top-1/2 -translate-y-1/2 w-4 h-[2px] bg-amber-500 shadow-[0_0_8px_orange]"></div>
               </div>
            </div>
        </div>
    </div>
  );
}
