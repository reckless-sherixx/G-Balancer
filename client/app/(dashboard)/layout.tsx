"use client";

import { Sidebar } from "@/components/dashboard-layout/Sidebar";
import { Topbar } from "@/components/dashboard-layout/Topbar";
import { useEffect, useRef, useState } from "react";
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Fixed Sidebar */}
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full md:ml-[280px] min-h-screen transition-all duration-300">
        {/* Fixed Topbar */}
        <Topbar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        
        {/* Scrollable Page Content */}
        <main ref={mainRef} className="flex-1 mt-20 p-4 sm:p-6 md:p-8 overflow-y-auto w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
