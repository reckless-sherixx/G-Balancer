"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import { useGridStore } from "@/hooks/useGridData";

import { Header } from "@/components/dashboard/Header";
import { CoreMetrics } from "@/components/dashboard/CoreMetrics";
import { EnergyChart } from "@/components/dashboard/EnergyChart";
import { BatteryPanel } from "@/components/dashboard/BatteryPanel";
import { AIDecision } from "@/components/dashboard/AIDecision";
import { FlowVisualizer } from "@/components/dashboard/FlowVisualizer";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";

if (typeof window !== "undefined") {
  gsap.config({ nullTargetWarn: false });
}

export default function Dashboard() {
  const container = useRef<HTMLDivElement>(null);
  const fetchDashboard = useGridStore((s) => s.fetchDashboard);
  const fetchForecast = useGridStore((s) => s.fetchForecast);

  useEffect(() => {
    const lenis = new Lenis();
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
    return () => {
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    void fetchDashboard();
    void fetchForecast("Mumbai", 24);

    const interval = setInterval(() => {
      void fetchDashboard();
      void fetchForecast("Mumbai", 24);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboard, fetchForecast]);

  useGSAP(() => {
    // Reveal all major panels sequentially
    gsap.from(".dash-panel", {
      y: 30,
      opacity: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: "power4.out",
      delay: 0.1
    });
  }, { scope: container });

  return (
    <main ref={container} className="bg-[#080808] min-h-screen text-white selection:bg-[#00ff87] selection:text-black overflow-x-hidden pb-20">
      <div className="dash-panel">
        <Header />
      </div>
      
      <div className="max-w-[1800px] mx-auto px-4 md:px-6 lg:px-12 mt-6 md:mt-8 flex flex-col gap-6 w-full">
        {/* Row 1: Core Live Metrics */}
        <div className="dash-panel w-full">
           <CoreMetrics />
        </div>

        {/* Row 2: Visual Chart & Battery Storage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
           <div className="dash-panel lg:col-span-2 w-full h-full">
              <EnergyChart />
           </div>
           <div className="dash-panel lg:col-span-1 w-full h-full">
              <BatteryPanel />
           </div>
        </div>

        {/* Row 3: Logic Hub, Flow routing, Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
           <div className="dash-panel col-span-1 w-full h-full">
              <AIDecision />
           </div>
           <div className="dash-panel col-span-1 w-full h-full">
              <FlowVisualizer />
           </div>
           <div className="dash-panel col-span-1 md:col-span-2 xl:col-span-1 w-full h-full">
              <AlertsFeed />
           </div>
        </div>
      </div>
    </main>
  );
}
