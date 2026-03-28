"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useState } from 'react';
import { Cloud, Sun, Wind } from 'lucide-react';
import { cn } from "@/utils/cn";

const MOCK_DATA = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  demand: 10000 + Math.sin(i / 3) * 3000 + Math.random() * 500,
  supply: 11000 + Math.sin(i / 3) * 2000 + Math.random() * 1000,
  solar: i > 6 && i < 18 ? Math.sin((i - 6) / 4) * 4000 : 0,
}));

export default function ForecastPage() {
  const [view, setView] = useState<"24h" | "72h">("24h");
  
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Predictive Forecast</h1>
          <p className="text-white/50 text-sm max-w-xl">Deep learning models analyze weather patterns and historical consumption to predict grid requirements up to 72 hours in advance.</p>
        </div>
        <div className="flex bg-[#111] p-1 rounded-lg border border-[#222]">
           <button onClick={() => setView("24h")} className={cn("px-4 py-2 text-sm font-bold tracking-widest uppercase rounded-md transition-colors", view === "24h" ? "bg-white text-black" : "text-white/50 hover:text-white")}>24 Hours</button>
           <button onClick={() => setView("72h")} className={cn("px-4 py-2 text-sm font-bold tracking-widest uppercase rounded-md transition-colors", view === "72h" ? "bg-white text-black" : "text-white/50 hover:text-white")}>72 Hours</button>
        </div>
      </div>

      {/* Weather Overlay Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111] border border-[#222] p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Cloud Cover</span>
            <div className="text-2xl font-mono">24%</div>
          </div>
          <Cloud className="w-8 h-8 text-white/20" />
        </div>
        <div className="bg-[#111] border border-[#222] p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Solar Irradiance</span>
            <div className="text-2xl font-mono">1.2k W/m²</div>
          </div>
          <Sun className="w-8 h-8 text-yellow-500/50" />
        </div>
        <div className="bg-[#111] border border-[#222] p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Wind Speed</span>
            <div className="text-2xl font-mono">14 km/h</div>
          </div>
          <Wind className="w-8 h-8 text-[#00F0FF]/50" />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#111] border border-[#222] p-6 lg:p-8 rounded-xl h-[500px] w-full flex flex-col gap-6">
         <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-[#00FF41]"></div>
             <span className="text-xs font-mono uppercase text-white/70">Predicted Supply</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-red-500"></div>
             <span className="text-xs font-mono uppercase text-white/70">Predicted Demand</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-yellow-400"></div>
             <span className="text-xs font-mono uppercase text-white/70">Solar Extrapolation</span>
           </div>
         </div>
         
         <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={100}>
            <AreaChart data={MOCK_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF41" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00FF41" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="time" stroke="#444" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#444" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                labelStyle={{ color: '#888', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}
              />
              <Area type="monotone" dataKey="supply" stroke="#00FF41" strokeWidth={2} fillOpacity={1} fill="url(#colorSupply)" />
              <Area type="monotone" dataKey="demand" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDemand)" />
              <Area type="monotone" dataKey="solar" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorSolar)" />
            </AreaChart>
          </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}
