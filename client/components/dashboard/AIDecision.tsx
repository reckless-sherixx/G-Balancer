"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TextPlugin } from "gsap/TextPlugin";
import { Sparkles, Cpu } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(TextPlugin, useGSAP);
}

export function AIDecision() {
  const container = useRef<HTMLDivElement>(null);
  
  useGSAP(() => {
    // Array of mock AI decisions
    const decisions = [
      "Analyzing grid frequency stability...",
      "Weather patterns indicate solar drop.",
      "Rerouting 40MW to secondary storage.",
      "Optimizing load distribution arrays...",
      "Activating fast-response protocol.",
      "Balancing algorithms executing...",
      "System fully stabilized at 60.00Hz."
    ];

    const tl = gsap.timeline({ repeat: -1 });

    decisions.forEach((decision) => {
      // Type new string
      tl.to(".ai-text", {
        duration: 1.5,
        text: decision,
        ease: "none"
      }, "+=0.2")
      // Hold reading time
      .to(".ai-text", { duration: 1.5 })
      // Blink cursor rapidly to simulate processing
      .to(".ai-cursor", { opacity: 0, duration: 0.1, yoyo: true, repeat: 5 })
      // Clear out text
      .to(".ai-text", { text: "", duration: 0.3 });
    });
  }, { scope: container });

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
