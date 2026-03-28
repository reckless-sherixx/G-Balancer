"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { 
  LayoutDashboard, Map, LineChart, Cpu, 
  Leaf, Bell, Settings, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { cn } from "@/utils/cn";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Grid Map", href: "/map", icon: Map },
  { name: "Forecast", href: "/forecast", icon: LineChart },
  { name: "Simulator", href: "/simulator", icon: Cpu },
  { name: "Carbon Tracker", href: "/carbon", icon: Leaf },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ 
  isMobileOpen, 
  setIsMobileOpen 
}: { 
  isMobileOpen?: boolean; 
  setIsMobileOpen?: (val: boolean) => void; 
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const container = useRef<HTMLElement>(null);

  useGSAP(() => {
    // Only animate if container exists
    if (!container.current) return;
    
    gsap.to(container.current, {
      width: isCollapsed ? 80 : 280,
      duration: 0.4,
      ease: "power3.inOut"
    });
    
    gsap.to(".nav-label", {
      opacity: isCollapsed ? 0 : 1,
      display: isCollapsed ? "none" : "block",
      duration: 0.2,
      delay: isCollapsed ? 0 : 0.2
    });
  }, [isCollapsed]);

  return (
    <aside 
      ref={container}
      className={cn(
        "fixed left-0 top-0 h-screen bg-[#0A0A0A] border-r border-[#222] z-50 flex flex-col pt-6 pb-6 transition-transform duration-300 md:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
      style={{ width: "280px" }}
    >
      {/* Brand */}
      <div className="px-6 flex items-center justify-between mb-10 overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white text-black flex items-center justify-center font-bold font-mono">
            G
          </div>
          <span className="nav-label text-xl font-bold tracking-tighter mix-blend-difference">Balancer</span>
        </div>
        <button 
          className="md:hidden p-1 text-white/50 hover:text-white"
          onClick={() => setIsMobileOpen?.(false)}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 flex flex-col gap-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "group relative flex items-center gap-4 px-4 py-3 rounded-lg transition-colors border border-transparent",
                isActive 
                  ? "bg-[#111] border-[#333] text-white" 
                  : "text-white/50 hover:bg-[#111] hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-[#00FF41]" : "group-hover:text-white/80")} />
              <span className="nav-label text-sm font-medium tracking-wide whitespace-nowrap">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <div className="hidden md:block px-4 mt-auto">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center py-3 bg-[#111] border border-[#222] hover:bg-[#1a1a1a] rounded-lg transition-colors group"
        >
           {isCollapsed ? (
             <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white" />
           ) : (
             <ChevronLeft className="w-5 h-5 text-white/50 group-hover:text-white" />
           )}
        </button>
      </div>
    </aside>
  );
}
