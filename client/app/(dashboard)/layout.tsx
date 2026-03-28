"use client";

import { Sidebar } from "@/components/dashboard-layout/Sidebar";
import { Topbar } from "@/components/dashboard-layout/Topbar";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  // Animate page transitions
  useGSAP(() => {
    if (mainRef.current) {
      gsap.fromTo(
        mainRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-syne overflow-x-hidden selection:bg-[#00FF41] selection:text-black">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-[280px]">
        {/* Fixed Topbar */}
        <Topbar />
        
        {/* Scrollable Page Content */}
        <main ref={mainRef} className="flex-1 mt-20 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
