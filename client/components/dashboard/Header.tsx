"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useGridStore } from "@/hooks/useGridData";

export function Header() {
  const [time, setTime] = useState("");
  const metrics = useGridStore((state) => state.metrics);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().split("T")[1].split(".")[0] + " UTC");
    };
    updateTime();
    const int = setInterval(updateTime, 1000);
    return () => clearInterval(int);
  }, []);

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#222] bg-[#0A0A0A] p-6 lg:px-12 w-full z-10 sticky top-0 gap-4 md:gap-0">
      <div className="flex items-center gap-4">
        <Zap className="text-[#00ff87] w-6 h-6" />
        <h1 className="font-bebas text-4xl md:text-5xl tracking-wide text-white leading-none mt-1">
          G-BALANCER <span className="text-white/30 text-xl font-mono align-top ml-2 hidden sm:inline-block">GRID</span>
        </h1>
      </div>
      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
        <div className="flex flex-col text-left md:text-right">
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-[#00ff87]">{metrics?.city ?? "Mumbai"} / Active</span>
          <span className="font-mono text-xs md:text-sm text-white/70">{time}</span>
        </div>
        <div className="flex items-center gap-2 border border-[#00ff87]/30 bg-[#00ff87]/10 px-4 py-2 rounded-full">
           <div className="w-2 h-2 rounded-full bg-[#00ff87] animate-pulse shadow-[0_0_10px_#00ff87]"></div>
           <span className="text-[10px] md:text-xs font-bold tracking-widest text-[#00ff87] uppercase">{metrics ? "System Live" : "Connecting"}</span>
        </div>
      </div>
    </header>
  );
}
