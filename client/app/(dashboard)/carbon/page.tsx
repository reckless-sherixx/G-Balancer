"use client";

import { useEffect, useState } from "react";
import { Leaf, TreePine, Banknote } from "lucide-react";
import { api, type CarbonMetrics } from "@/services/api";

export default function CarbonPage() {
  const [metrics, setMetrics] = useState<CarbonMetrics | null>(null);

  useEffect(() => {
    api.getCarbonMetrics().then(setMetrics);
  }, []);

  return (
    <div className="flex flex-col gap-12 pb-10 min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Decarbonization Impact</h1>
        <p className="text-white/50 text-sm max-w-xl">
          Real-time tracking of CO₂ offset achieved by G-Balancer&apos;s dynamic load routing and intelligent battery dispatch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* CO2 Saved */}
        <div className="bg-[#111] border border-[#222] p-8 md:p-10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-8">
            <span className="text-xs uppercase font-bold tracking-widest text-white/50">CO₂ Avoided Today</span>
            <Leaf className="w-6 h-6 text-[#00FF41]" />
          </div>
          <div>
            <div className="flex items-end gap-2">
              <span className="text-6xl lg:text-7xl font-bold tracking-tighter mix-blend-difference">{metrics?.savedToday || 0}</span>
              <span className="text-2xl lg:text-3xl text-white/30 font-light mb-2">t</span>
            </div>
            <p className="text-sm font-light text-white/40 mt-4 leading-relaxed">
              Based on immediate reduction in peaker plant firing.
            </p>
          </div>
        </div>

        {/* Equivalent Trees */}
        <div className="bg-[#111] border border-[#222] p-8 md:p-10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-8">
            <span className="text-xs uppercase font-bold tracking-widest text-[#00F0FF]">Equivalent Growth</span>
            <TreePine className="w-6 h-6 text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-end gap-2">
              <span className="text-6xl lg:text-7xl font-bold tracking-tighter mix-blend-difference">{metrics?.treesEquivalent || 0}</span>
            </div>
            <p className="text-sm font-light text-[#00F0FF]/40 mt-4 leading-relaxed uppercase tracking-widest">
              Trees planted equivalent.
            </p>
          </div>
        </div>

        {/* Carbon Credits */}
        <div className="bg-[#111] border border-[#222] p-8 md:p-10 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700] rounded-full mix-blend-overlay blur-3xl opacity-10 blur-[80px]"></div>
          <div className="flex items-start justify-between mb-8 relative z-10">
            <span className="text-xs uppercase font-bold tracking-widest text-white/50">Exchange Value</span>
            <Banknote className="w-6 h-6 text-[#FFD700]" />
          </div>
          <div className="relative z-10">
            <div className="flex items-end gap-2">
              <span className="text-3xl lg:text-4xl text-white/30 font-light mb-1">₹</span>
              <span className="text-5xl lg:text-6xl font-bold tracking-tighter mix-blend-difference">
                {metrics ? (metrics.creditsEarned / 1000).toFixed(1) + 'k' : 0}
              </span>
            </div>
            <p className="text-sm font-light text-white/40 mt-4 leading-relaxed flex items-center justify-between">
              <span>Tokenized Credits</span>
              <span className="text-[10px] bg-[#1a1a1a] px-2 py-1 uppercase rounded text-green-400">+12% vs last week</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-1 border border-[#222] rounded-full max-w-max bg-[#111] flex items-center gap-4 text-xs tracking-widest font-mono uppercase text-white/40 group cursor-crosshair">
         <span className="bg-white/10 px-4 py-3 rounded-full text-white group-hover:bg-[#00FF41] group-hover:text-black transition-colors">Export Ledger</span>
         <span className="pr-6 opacity-50">Blockchain proof verified at 10:45 AM</span>
      </div>
    </div>
  );
}
