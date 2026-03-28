"use client";

import { Bell, MapPin, User, CheckCircle2, AlertTriangle, XCircle, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/cn";

export function Topbar({ 
  isMobileOpen, 
  setIsMobileOpen 
}: { 
  isMobileOpen?: boolean; 
  setIsMobileOpen?: (val: boolean) => void; 
}) {
  const [city, setCity] = useState("Bangalore");
  const [gridStatus, setGridStatus] = useState<"LIVE" | "WARNING" | "CRITICAL">("LIVE");

  return (
    <header className="fixed top-0 w-full h-20 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222] z-30 flex items-center justify-between px-4 sm:px-6 md:px-8 transition-all duration-300 md:pl-[300px]" style={{ paddingLeft: 'calc(var(--sidebar-width, 0px) + 1rem)' }}>
      {/* Current Context */}
      <div className="flex items-center gap-3 sm:gap-6">
        <button 
          className="md:hidden p-2 -ml-2 text-white/70 hover:text-white"
          onClick={() => setIsMobileOpen?.(!isMobileOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
        {/* City Selector */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#111] rounded-lg border border-[#222] cursor-pointer hover:border-[#444] transition-colors">
          <MapPin className="w-4 h-4 text-[#00FF41]" />
          <span className="text-sm font-semibold tracking-wide">{city} Grid</span>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2">
          {gridStatus === "LIVE" && <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse"></div>}
          {gridStatus === "WARNING" && <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>}
          {gridStatus === "CRITICAL" && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-white/50">
            {gridStatus === "LIVE" && "System Nominal"}
            {gridStatus === "WARNING" && "Load Warning"}
            {gridStatus === "CRITICAL" && "Critical Anomaly"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-full bg-[#111] border border-[#222] flex items-center justify-center hover:bg-[#1a1a1a] hover:border-[#444] transition-colors">
          <Bell className="w-4 h-4 text-white/70" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00FF41]"></span>
        </button>

        {/* Profile */}
        <button className="flex items-center gap-3 pl-3 pr-4 py-2 bg-[#111] rounded-full border border-[#222] hover:border-[#444] transition-colors">
          <div className="w-6 h-6 rounded-full bg-[#222] flex items-center justify-center">
            <User className="w-3 h-3 text-white/50" />
          </div>
          <span className="text-xs font-bold tracking-wide">Operator 01</span>
        </button>
      </div>
    </header>
  );
}
