"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Activity, Zap, Cpu } from "lucide-react";

export function CoreMetrics() {
  const container = useRef<HTMLDivElement>(null);
  const freqRef = useRef<HTMLSpanElement>(null);
  const loadRef = useRef<HTMLSpanElement>(null);
  const confRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    // Initial entrance animation
    gsap.from(".metric-card", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    });

    // Simulate real-time fluctuations
    const interval = setInterval(() => {
      if (freqRef.current) {
        gsap.to(freqRef.current, {
          innerHTML: 59.8 + Math.random() * 0.4,
          duration: 1.2,
          snap: { innerHTML: 0.01 },
          onUpdate: function() { 
            freqRef.current!.innerHTML = Number(freqRef.current!.innerHTML).toFixed(2); 
          }
        });
      }
      
      if (loadRef.current) {
        gsap.to(loadRef.current, {
          innerHTML: 4200 + Math.random() * 800,
          duration: 2.5,
          ease: "power2.inOut",
          snap: { innerHTML: 1 },
          onUpdate: function() { 
            loadRef.current!.innerHTML = Number(loadRef.current!.innerHTML).toLocaleString(); 
          }
        });
      }

      if (confRef.current) {
        gsap.to(confRef.current, {
          innerHTML: 98 + Math.random() * 1.9,
          duration: 1.5,
          snap: { innerHTML: 0.1 },
          onUpdate: function() { 
            confRef.current!.innerHTML = Number(confRef.current!.innerHTML).toFixed(1); 
          }
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, { scope: container });

  return (
    <div ref={container} className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 w-full">
       <div className="metric-card bg-[#141414] border border-[#222] p-6 flex flex-col justify-between h-40 hover:border-[#333] transition-colors relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
         <div className="flex justify-between items-start text-white/50">
           <span className="font-mono text-xs uppercase tracking-widest">Grid Frequency</span>
           <Activity className="w-5 h-5 text-amber-500" />
         </div>
         <div className="flex items-baseline gap-2 mt-4">
           <span ref={freqRef} className="font-bebas text-6xl text-white leading-none tracking-tight">60.00</span>
           <span className="font-mono text-sm text-amber-500">Hz</span>
         </div>
       </div>

       <div className="metric-card bg-[#141414] border border-[#222] p-6 flex flex-col justify-between h-40 hover:border-[#333] transition-colors relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
         <div className="flex justify-between items-start text-white/50">
           <span className="font-mono text-xs uppercase tracking-widest">Active Load</span>
           <Zap className="w-5 h-5 text-white/30" />
         </div>
         <div className="flex items-baseline gap-2 mt-4">
           <span ref={loadRef} className="font-bebas text-6xl text-white leading-none tracking-tight">4,520</span>
           <span className="font-mono text-sm text-white/40">MW</span>
         </div>
       </div>

       <div className="metric-card bg-[#141414] border border-[#222] p-6 flex flex-col justify-between h-40 hover:border-[#00ff87]/30 transition-colors relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00ff87]/50 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
         <div className="flex justify-between items-start text-white/50">
           <span className="font-mono text-xs uppercase tracking-widest">AI Confidence</span>
           <Cpu className="w-5 h-5 text-[#00ff87]" />
         </div>
         <div className="flex items-baseline gap-2 mt-4">
           <span ref={confRef} className="font-bebas text-6xl text-[#00ff87] leading-none tracking-tight">99.4</span>
           <span className="font-mono text-sm text-[#00ff87]">%)</span>
         </div>
       </div>
    </div>
  );
}
