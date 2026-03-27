"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AlertTriangle, Info, XCircle } from "lucide-react";

type Alert = {
  id: number;
  type: "info" | "warning" | "critical";
  message: string;
  time: string;
};

const MOCK_ALERTS: Omit<Alert, 'id' | 'time'>[] = [
  { type: "info", message: "Node 142 synchronization complete." },
  { type: "warning", message: "Minor frequency drop in Sector 7." },
  { type: "info", message: "Battery array B engaging charge mode." },
  { type: "critical", message: "Connection lost to Weather Station Alpha." },
  { type: "warning", message: "Load spike predicted in 15 mins." },
];

export function AlertsFeed() {
  const container = useRef<HTMLDivElement>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Seed initial alerts
  useEffect(() => {
    const initial = MOCK_ALERTS.slice(0, 3).map((a, i) => ({
      ...a,
      id: Date.now() + i,
      time: new Date().toLocaleTimeString('en-US', { hour12: false })
    }));
    setAlerts(initial);
  }, []);

  // Simulate pushing new alerts periodically
  useEffect(() => {
    const int = setInterval(() => {
      setAlerts(prev => {
        const randomAlert = MOCK_ALERTS[Math.floor(Math.random() * MOCK_ALERTS.length)];
        const newAlert = {
          ...randomAlert,
          id: Date.now(),
          time: new Date().toLocaleTimeString('en-US', { hour12: false })
        };
        // Keep only last 4
        return [newAlert, ...prev].slice(0, 4);
      });
    }, 4500);
    return () => clearInterval(int);
  }, []);

  useGSAP(() => {
    if (alerts.length === 0) return;
    
    // Animate new elements whenever the alerts array changes
    gsap.fromTo(".alert-item", 
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
    );
  }, { scope: container, dependencies: [alerts] });

  return (
    <div ref={container} className="bg-[#141414] border border-[#222] p-6 lg:p-8 flex flex-col h-[400px] overflow-hidden group hover:border-[#333] transition-colors">
       <div className="flex justify-between items-center mb-6">
         <h3 className="font-bebas text-2xl tracking-wide text-white">Live Operations Feed</h3>
         <span className="font-mono text-[10px] uppercase text-white/40 tracking-widest px-2 py-1 bg-[#1A1A1A] border border-[#333] rounded-sm">Polling...</span>
       </div>

       <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {alerts.map((alert) => (
            <div key={alert.id} className="alert-item flex items-start gap-3 p-3 bg-[#0A0A0A] border-l-2 border-[#333]">
                {alert.type === "info" && <Info className="w-4 h-4 text-[#00ff87] mt-0.5 shrink-0" />}
                {alert.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
                {alert.type === "critical" && <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0 animate-pulse" />}
                
                <div className="flex flex-col">
                   <div className="flex items-center gap-2">
                     <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${
                        alert.type === 'info' ? 'text-[#00ff87]' : 
                        alert.type === 'warning' ? 'text-amber-500' : 'text-red-500'
                     }`}>
                       {alert.type}
                     </span>
                     <span className="font-mono text-[8px] text-white/30">{alert.time}</span>
                   </div>
                   <p className="font-sans text-xs text-white/80 mt-1 leading-snug">{alert.message}</p>
                </div>
            </div>
          ))}
       </div>
    </div>
  );
}
