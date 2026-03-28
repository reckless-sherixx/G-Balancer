"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info, ShieldAlert, Filter } from "lucide-react";
import { useGridStore } from "@/hooks/useGridData";
import { cn } from "@/utils/cn";

export default function AlertsPage() {
  const { alerts, fetchAlerts } = useGridStore();
  const [filter, setFilter] = useState<"ALL" | "INFO" | "WARNING" | "CRITICAL">("ALL");
  const filters: Array<"ALL" | "CRITICAL" | "WARNING" | "INFO"> = ["ALL", "CRITICAL", "WARNING", "INFO"];

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = alerts.filter(a => filter === "ALL" || a.type === filter);

  return (
    <div className="flex flex-col gap-8 pb-10 min-h-[calc(100vh-8rem)] max-w-5xl">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">System Diagnostics</h1>
        <p className="text-white/50 text-sm max-w-xl">
          Real-time event ledger logging algorithmic decisions and grid state changes.
        </p>
      </div>

      <div className="flex items-center gap-4 border-b border-[#222] pb-6">
         <Filter className="w-4 h-4 text-white/50" />
         {filters.map((flt) => (
           <button 
             key={flt}
             onClick={() => setFilter(flt)}
             className={cn(
               "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors border",
               filter === flt 
                 ? "bg-white text-black border-transparent" 
                 : "bg-[#111] border-[#222] text-white/50 hover:text-white"
             )}
           >
             {flt}
           </button>
         ))}
      </div>

      <div className="flex flex-col gap-4">
         {filteredAlerts.length === 0 ? (
           <div className="py-20 text-center text-white/30 text-sm tracking-widest uppercase font-mono border border-dashed border-[#222] rounded-xl flex flex-col items-center gap-4">
              <ShieldAlert className="w-8 h-8 opacity-20" />
              Zero {filter} events found.
           </div>
         ) : (
           filteredAlerts.map(alert => (
             <div 
               key={alert.id}
               className={cn(
                 "p-6 rounded-xl border flex gap-6 items-start transition-colors",
                 alert.type === "CRITICAL" ? "bg-red-500/5 border-red-500/20" :
                 alert.type === "WARNING" ? "bg-yellow-400/5 border-yellow-400/20" :
                 "bg-[#0A0A0A] border-[#222]"
               )}
             >
                <div className="mt-1 shrink-0">
                  {alert.type === "CRITICAL" && <AlertTriangle className="w-6 h-6 text-red-500" />}
                  {alert.type === "WARNING" && <AlertTriangle className="w-6 h-6 text-yellow-500" />}
                  {alert.type === "INFO" && <Info className="w-6 h-6 text-[#00F0FF]" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                     <span className={cn(
                       "text-[10px] uppercase font-bold tracking-widest",
                       alert.type === "CRITICAL" ? "text-red-500" :
                       alert.type === "WARNING" ? "text-yellow-500" :
                       "text-[#00F0FF]"
                     )}>
                       {alert.type} PRIORITY
                     </span>
                     <span className="text-xs font-mono text-white/30">{alert.time}</span>
                  </div>
                  <p className="text-white/80 font-light leading-relaxed">{alert.msg}</p>
                </div>
             </div>
           ))
         )}
      </div>
    </div>
  );
}
