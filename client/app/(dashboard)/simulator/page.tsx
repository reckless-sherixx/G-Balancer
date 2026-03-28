"use client";

import { useState } from "react";
import { Play, RotateCcw, Zap, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { api } from "@/services/api";

const MOCK_SCENARIOS = [
  { id: "solar_drop", label: "Massive Solar Drop", desc: "Simulates a sudden 80% loss in solar irradiance." },
  { id: "demand_spike", label: "Extreme Demand Spike", desc: "Simulates an unexpected surge in industrial or residential load." },
  { id: "heatwave", label: "Unseasonable Heatwave", desc: "Simulates sustained cooling demands over 48 hours." },
  { id: "battery_fail", label: "Node Failure", desc: "Simulates a complete failure of the primary battery array." },
];

export default function SimulatorPage() {
  const [scenario, setScenario] = useState(MOCK_SCENARIOS[0].id);
  const [severity, setSeverity] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSimulate = async () => {
    setIsRunning(true);
    const data = await api.runSimulation(scenario, severity);
    setResult(data);
    setIsRunning(false);
  };

  const handleReset = () => {
    setResult(null);
    setSeverity(50);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-10 min-h-[calc(100vh-8rem)]">
      {/* Configuration Panel */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Grid Simulator</h1>
          <p className="text-white/50 text-sm">Stress-test the neural network against extreme anomaly events.</p>
        </div>

        <div className="bg-[#111] border border-[#222] p-6 rounded-xl flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-xs uppercase font-bold tracking-widest text-[#00F0FF]">Event Vector</label>
            <div className="flex flex-col gap-2">
              {MOCK_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={cn(
                    "text-left p-3 rounded-md border transition-all duration-300 flex flex-col gap-1",
                    scenario === s.id ? "bg-[#1A1A1A] border-[#00F0FF]/50" : "bg-[#0A0A0A] border-[#222] hover:border-[#333]"
                  )}
                >
                  <span className={cn("text-sm font-bold", scenario === s.id ? "text-white" : "text-white/70")}>{s.label}</span>
                  <span className="text-[10px] text-white/40 leading-snug">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-[#222]">
            <label className="flex justify-between w-full">
              <span className="text-xs uppercase font-bold tracking-widest text-[#00F0FF]">Severity Protocol</span>
              <span className="text-xs font-mono">{severity}%</span>
            </label>
            <input 
              type="range" 
              min="0" max="100" 
              value={severity} 
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-[#00F0FF] cursor-pointer" 
            />
          </div>
          
          <div className="flex gap-4 pt-4">
             <button 
               onClick={handleSimulate}
               disabled={isRunning}
               className="flex-1 py-3 bg-[#00F0FF] text-black font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#00D0E0] transition-colors disabled:opacity-50"
             >
               {isRunning ? <Zap className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
               Initialize
             </button>
             <button 
               onClick={handleReset}
               className="px-4 py-3 bg-[#222] text-white font-bold uppercase tracking-widest text-xs hover:bg-[#333] transition-colors"
             >
               <RotateCcw className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

      {/* Output Panel */}
      <div className="w-full lg:w-2/3 bg-[#0A0A0A] border border-[#222] rounded-xl flex flex-col relative overflow-hidden">
         {!result ? (
           <div className="m-auto flex flex-col items-center justify-center opacity-30 gap-4 text-center p-8">
             <AlertTriangle className="w-16 h-16" />
             <p className="text-xl uppercase tracking-widest font-light">Awaiting simulation parameters.</p>
           </div>
         ) : (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full w-full">
             <div className="p-6 md:p-8 border-b border-[#222] bg-[#111]">
               <h3 className="text-xl font-bold mb-2">Simulation Complete</h3>
               <p className="text-sm text-white/50">G-Balancer AI evaluated the scenario and executed automated protective measures.</p>
             </div>
             
             <div className="flex-1 p-6 md:p-8 flex flex-col justify-center gap-12">
               {/* Before/After Metrics */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                 {/* Before */}
                 <div className="flex flex-col gap-4 bg-[#111] p-6 border border-[#222] rounded-lg relative overflow-hidden">
                   <div className="absolute top-0 w-full h-1 bg-white/20 left-0"></div>
                   <span className="text-xs font-mono uppercase text-white/40 tracking-widest">Base State</span>
                   <div>
                     <span className="text-[10px] uppercase block text-white/30">System Load</span>
                     <span className="text-3xl font-bold">{result.before.demand.toLocaleString()} MW</span>
                   </div>
                   <div>
                     <span className="text-[10px] uppercase block text-white/30">Reserve Capacity</span>
                     <span className="text-2xl font-mono text-green-400">{result.before.battery}%</span>
                   </div>
                 </div>
                 
                 <div className="flex justify-center text-white/30">
                   <ArrowRight className="w-8 h-8 md:w-12 md:h-12" />
                 </div>

                 {/* After */}
                 <div className="flex flex-col gap-4 bg-[#111] p-6 border border-[#222] rounded-lg relative overflow-hidden">
                   <div className="absolute top-0 w-full h-1 bg-red-500 left-0"></div>
                   <span className="text-xs font-mono uppercase text-[#00F0FF] tracking-widest">Post-Event</span>
                   <div>
                     <span className="text-[10px] uppercase block text-white/30">System Load</span>
                     <span className="text-3xl font-bold text-red-400">{Math.round(result.after.demand).toLocaleString()} MW</span>
                   </div>
                   <div>
                     <span className="text-[10px] uppercase block text-white/30">Reserve Capacity</span>
                     <span className="text-2xl font-mono text-yellow-400">{result.after.battery}%</span>
                   </div>
                 </div>
               </div>

               {/* AI Recommendation */}
               <div className="bg-[#111] border-l-4 border-l-[#00FF41] p-6">
                 <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#00FF41] mb-2">Automated Action Taken</h4>
                 <p className="text-lg leading-relaxed text-white/90 font-light">{result.recommendation}</p>
                 <div className="mt-4 flex gap-4">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-[#00FF41]"></div>
                     <span className="text-[10px] uppercase text-white/50 tracking-widest">Success Probability 99.4%</span>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}
