"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Battery } from "lucide-react";

export function BatteryPanel() {
  const container = useRef<HTMLDivElement>(null);
  
  useGSAP(() => {
    // Fill animation 0 to 86%
    gsap.fromTo(".battery-fill",
      { height: "0%" },
      { height: "86%", duration: 3, ease: "power3.inOut" }
    );

    gsap.to(".battery-level-text", {
      innerHTML: 86,
      duration: 3,
      snap: { innerHTML: 1 },
      ease: "power3.inOut"
    });

    // Simulate charging pulse
    gsap.to(".charge-pulse", {
      opacity: 0.1,
      yoyo: true,
      repeat: -1,
      duration: 1.5,
      ease: "none"
    });
  }, { scope: container });

  return (
    <div ref={container} className="bg-[#141414] border border-[#222] p-6 lg:p-8 flex flex-col h-[400px] hover:border-[#333] transition-colors group relative">
       <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-[#00ff87]/30 to-transparent -translate-y-full group-hover:translate-y-full duration-1000 transition-transform"></div>
       
       <div className="flex justify-between items-start mb-auto">
         <div>
           <h3 className="font-bebas text-3xl tracking-wide text-white">Array Storage</h3>
           <p className="font-mono text-[10px] text-[#00ff87] uppercase tracking-widest mt-1 animate-pulse">Charging</p>
         </div>
         <Battery className="w-5 h-5 text-white/30" />
       </div>

       <div className="flex flex-col items-center justify-center flex-1 my-4">
          <div className="relative w-24 h-48 border-2 border-[#333] rounded-sm p-1 flex flex-col justify-end overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
             {/* Battery Nodes */}
             <div className="charge-pulse absolute inset-0 bg-white/20 z-10 pointer-events-none"></div>
             
             {/* Fill */}
             <div className="battery-fill w-full bg-[#00ff87] shadow-[0_0_15px_#00ff87] relative">
                <div className="absolute top-0 w-full h-[2px] bg-white opacity-50"></div>
             </div>
          </div>
          <div className="w-8 h-2 bg-[#333] rounded-t-sm -mt-[200px] mb-[192px]"></div>
       </div>

       <div className="flex justify-between items-end">
         <div className="font-mono text-xs text-white/40 uppercase tracking-widest focus:ring">Capacity</div>
         <div className="flex items-baseline gap-1">
           <span className="battery-level-text font-bebas text-5xl text-white">0</span>
           <span className="font-mono text-sm text-[#00ff87]">%</span>
         </div>
       </div>
    </div>
  );
}
