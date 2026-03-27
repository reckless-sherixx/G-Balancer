"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { 
  ArrowRight, Activity, Zap, Cpu, Focus, ShieldCheck, 
  BarChart4, CloudLightning, Database, Power, Maximize,
  Menu, X
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// SplitText helper for staggered character animation
const SplitText = ({ children, className = "" }: { children: string; className?: string }) => {
  return (
    <span className={`inline-block ${className}`} aria-label={children}>
      {children.split(" ").map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap overflow-hidden">
          {word.split("").map((char, charIndex) => (
            <span key={`${wordIndex}-${charIndex}`} className="split-char inline-block opacity-0 translate-y-full will-change-transform">
              {char}
            </span>
          ))}
          <span className="inline-block w-[0.25em]">&nbsp;</span>
        </span>
      ))}
    </span>
  );
};

export default function Home() {
  const container = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useGSAP(() => {
    // ----------------------------------------------------
    // HERO ANIMATIONS
    // ----------------------------------------------------
    const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });

    heroTl
      .to(".split-char", {
        y: 0,
        opacity: 1,
        stagger: 0.02,
        duration: 1.2,
      })
      .fromTo(
        ".hero-fade",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.15, duration: 1 },
        "-=0.9"
      )
      .fromTo(
        ".hero-visual-block",
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 1, duration: 1.5, stagger: 0.1, ease: "expo.out", transformOrigin: "bottom" },
        "-=1.2"
      )
      .fromTo(
        ".hero-spark",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(2)" },
        "-=0.8"
      );

    // Hero Parallax
    gsap.to(".hero-visual-wrapper", {
      yPercent: 20,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });

    // ----------------------------------------------------
    // PROBLEM SECTION
    // ----------------------------------------------------
    gsap.from(".prob-fade", {
      y: 60,
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".problem-section",
        start: "top 80%",
      },
    });

    // ----------------------------------------------------
    // SOLUTION SECTION (3 Steps)
    // ----------------------------------------------------
    const solTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".solution-section",
        start: "top 75%",
      },
    });

    solTl
      .from(".sol-header", { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" })
      .from(".sol-step", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
      }, "-=0.4");

    // ----------------------------------------------------
    // AI SECTION
    // ----------------------------------------------------
    gsap.from(".ai-card", {
      scale: 0.95,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".ai-section",
        start: "top 70%",
      },
    });

    gsap.fromTo(
      ".ai-graph-bar",
      { height: 0 },
      {
        height: "100%",
        duration: 1.5,
        stagger: 0.1,
        ease: "expo.inOut",
        scrollTrigger: {
          trigger: ".ai-section",
          start: "top 60%",
        },
      }
    );

    // ----------------------------------------------------
    // SYSTEM FLOW
    // ----------------------------------------------------
    const flowTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".flow-section",
        start: "top 70%",
      },
    });

    flowTl
      .from(".flow-node", { scale: 0, opacity: 0, duration: 0.6, stagger: 0.2, ease: "back.out(1.5)" })
      .to(".flow-line", { scaleX: 1, duration: 0.6, stagger: 0.2, ease: "power2.inOut" }, "-=0.8")
      .to(".flow-particle", {
        keyframes: {
          "0%": { x: "0%", opacity: 0 },
          "50%": { opacity: 1 },
          "100%": { x: "100%", opacity: 0 }
        },
        duration: 1.5,
        stagger: 0.2,
        repeat: -1,
        ease: "none",
      }, "-=0.2");

    // ----------------------------------------------------
    // DASHBOARD ANIMATION
    // ----------------------------------------------------
    const dashTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".dashboard-section",
        start: "top 60%",
      },
    });

    dashTl
      .from(".dash-wrapper", { y: 50, opacity: 0, duration: 1, ease: "power4.out" })
      .from(".dash-element", { opacity: 0, y: 20, stagger: 0.1, duration: 0.6, ease: "power2.out" })
      .to(".dash-stat", {
        innerHTML: 99.9,
        duration: 2,
        ease: "power2.out",
        snap: { innerHTML: 0.1 },
        onUpdate: function() {
          const els = gsap.utils.toArray(".dash-stat") as HTMLElement[];
          els.forEach(el => {
            el.innerHTML = Number(el.innerHTML).toFixed(1) + "%";
          });
        }
      }, "-=0.5")
      .fromTo(".dash-stroke", { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" }, "-=2");

    // ----------------------------------------------------
    // FEATURES
    // ----------------------------------------------------
    gsap.from(".feature-card", {
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".features-section",
        start: "top 80%",
      },
    });

    // ----------------------------------------------------
    // IMPACT & FOOTER
    // ----------------------------------------------------
    gsap.from(".impact-text", {
      scale: 0.9,
      opacity: 0,
      duration: 1.2,
      ease: "expo.out",
      scrollTrigger: {
        trigger: ".impact-section",
        start: "top 80%",
      },
    });

  }, { scope: container });

  return (
    <div ref={container} className="bg-[#0B0B0B] text-white min-h-screen font-sans overflow-x-hidden selection:bg-[#00FF41] selection:text-black">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 md:px-12 lg:px-24 py-6 flex items-center justify-between mix-blend-difference">
        <div className="text-xl font-bold tracking-tighter">G-Balancer</div>
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide uppercase text-white/70">
            <a href="#" className="hover:text-white transition-colors">Platform</a>
            <a href="#" className="hover:text-white transition-colors">Technology</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <button className="px-5 py-2.5 bg-white text-black font-semibold hover:scale-105 will-change-transform transition-transform">
              Get Started
            </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 -mr-2 text-white relative z-50" 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
           {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 bg-[#050505] flex flex-col items-center justify-center gap-10 text-2xl uppercase tracking-widest transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.3,1)] ${menuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <a href="#" className="hover:text-[#00FF41] transition-colors" onClick={() => setMenuOpen(false)}>Platform</a>
          <a href="#" className="hover:text-[#00FF41] transition-colors" onClick={() => setMenuOpen(false)}>Technology</a>
          <a href="#" className="hover:text-[#00FF41] transition-colors" onClick={() => setMenuOpen(false)}>Docs</a>
          <button className="mt-8 px-8 py-4 bg-white text-black font-bold text-lg" onClick={() => setMenuOpen(false)}>
            Get Started
          </button>
      </div>

      {/* 1. HERO SECTION */}
      <section className="hero-section relative w-full min-h-[100svh] flex items-center justify-between px-6 md:px-12 lg:px-24 border-b border-[#222] pt-20">
        {/* Left Content */}
        <div className="z-10 w-full lg:w-1/2 flex flex-col gap-6 mt-12 md:mt-0">
          <div className="hero-fade inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#222] bg-[#111] w-max">
            <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse"></span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-white/70 font-medium">System Online</span>
          </div>
          
          <h1 className="text-[13vw] leading-[0.8] sm:text-7xl md:text-[6rem] lg:text-[8rem] font-bold tracking-tighter mix-blend-difference">
            <SplitText>G-Balancer</SplitText>
          </h1>
          
          <p className="hero-fade text-xl sm:text-2xl md:text-3xl font-medium text-white/90 max-w-xl leading-snug">
            Balancing the future of energy with AI.
          </p>
          
          <p className="hero-fade text-base sm:text-lg md:text-xl text-white/50 max-w-lg leading-relaxed mt-2">
            Predict supply. Forecast demand. Stabilize the grid in real time with autonomous decision engines.
          </p>
          
          <div className="hero-fade mt-6 md:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 w-full sm:w-max">
            <button className="group relative px-6 md:px-8 py-4 bg-white text-black font-semibold uppercase tracking-wider text-sm transition-transform hover:scale-105 will-change-transform flex items-center justify-center gap-3">
              Deploy Protocol
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-6 md:px-8 py-4 bg-transparent text-white font-semibold uppercase tracking-wider text-sm border border-[#333] hover:border-white transition-colors flex items-center justify-center">
              Read Docs
            </button>
          </div>
        </div>

        {/* Right Visual (Abstract Architecture) */}
        <div className="hero-visual-wrapper hidden lg:flex w-1/2 h-full absolute right-0 top-0 items-center justify-end pr-12 xl:pr-24 pointer-events-none mix-blend-screen">
          <div className="relative w-[400px] xl:w-[500px] h-[500px] xl:h-[600px] flex items-end justify-between gap-3 xl:gap-4">
            {/* Generating an abstract techy cityscape/grid of energy columns */}
            {[40, 70, 30, 90, 50, 80, 20, 100].map((h, i) => (
              <div key={i} className="hero-visual-block relative w-8 xl:w-12 bg-[#1A1A1A] border-t border-[#333]" style={{ height: `${h}%` }}>
                <div className="absolute top-0 left-0 w-full h-1 bg-[#00FF41] opacity-50"></div>
                {/* Randomly place a spark */}
                {i % 2 === 0 && (
                  <div className="hero-spark absolute -top-4 left-1/2 -translate-x-1/2 text-[#00FF41]">
                    <Zap className="w-4 xl:w-5 h-4 xl:h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section className="problem-section w-full py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-[#050505]">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-8 md:gap-12">
          <CloudLightning className="prob-fade w-16 h-16 md:w-20 md:h-20 text-[#333]" />
          <h2 className="prob-fade text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
            Renewable energy is <span className="text-[#00FF41]">volatile</span>. <br />
            The grid was built for <span className="text-white/30">constants</span>.
          </h2>
          <p className="prob-fade text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed">
            Legacy systems fail to adapt to real-time fluctuations in solar and wind output. Without intelligent balancing, clean energy leads to grid instability and wasted potential.
          </p>
        </div>
      </section>

      {/* 3. SOLUTION SECTION */}
      <section className="solution-section w-full py-24 md:py-32 px-6 md:px-12 lg:px-24">
        <div className="sol-header mb-16 md:mb-20 md:w-1/2">
          <h2 className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-[#00FF41] mb-4">The Solution</h2>
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">Three Pillars of Grid Stability</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            { tag: "01", title: "Predict", desc: "Ingest weather models and consumption histories to forecast supply and demand with 99% accuracy.", icon: <Activity className="w-8 h-8 text-white/50" /> },
            { tag: "02", title: "Balance", desc: "Dynamically route surplus power to battery arrays during peak generation periods.", icon: <Focus className="w-8 h-8 text-white/50" /> },
            { tag: "03", title: "Optimize", desc: "Automate discharge cycles based on real-time grid frequency and spot pricing metrics.", icon: <Zap className="w-8 h-8 text-[#00FF41]" /> }
          ].map((item, i) => (
            <div key={i} className="sol-step flex flex-col gap-6 p-8 md:p-10 bg-[#111] border border-[#222] hover:border-[#444] transition-colors relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00FF41]/50 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-white/30">{item.tag}</span>
                {item.icon}
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-semibold mb-3">{item.title}</h4>
                <p className="text-white/50 mt-1 md:mt-2 text-sm md:text-base leading-relaxed font-light">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. AI SECTION */}
      <section className="ai-section w-full py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-[#0B0B0B] border-t border-[#1a1a1a]">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-20 items-center">
          <div className="w-full lg:w-1/2 ai-card bg-[#0A0A0A] border border-[#222] p-6 lg:p-8 aspect-square min-h-[300px] relative flex items-end overflow-hidden">
            {/* Abstract AI Graph */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.03] to-transparent pointer-events-none" />
            <div className="w-full h-[70%] flex items-end gap-1 md:gap-2 px-2 md:px-4 relative z-10">
               {[20, 35, 25, 60, 45, 80, 65, 95, 85, 100].map((h, i) => (
                 <div key={i} className="flex-1 bg-[#1A1A1A] relative h-full">
                   <div className="ai-graph-bar absolute bottom-0 w-full bg-[#00F0FF]/20" style={{ height: "0%" }}>
                     <div className="absolute top-0 w-full h-1 bg-[#00F0FF]"></div>
                   </div>
                 </div>
               ))}
               {/* Overlay target line */}
               <div className="absolute top-1/4 left-0 w-full mb-1 border-b border-dashed border-[#00FF41] opacity-60">
                 <span className="absolute -top-6 right-2 md:right-4 text-[10px] md:text-xs font-mono text-[#00FF41]">STABILITY THRESHOLD</span>
               </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex flex-col gap-6 lg:gap-8">
            <Cpu className="w-10 h-10 md:w-12 md:h-12 text-[#00F0FF]" />
            <h3 className="text-4xl md:text-5xl font-semibold tracking-tight">Cognitive Engine.</h3>
            <p className="text-lg md:text-xl text-white/50 leading-relaxed font-light max-w-lg">
              Our proprietary neural network processes over 10 million data points per second. It anticipates macro grid shifting hours before traditional operators can react.
            </p>
            <div className="flex flex-col gap-4 mt-2 md:mt-4">
              <div className="flex items-center gap-4 border-b border-[#222] pb-4">
                <Database className="w-5 h-5 text-white/40 flex-shrink-0" />
                <span className="text-base md:text-lg">Real-time Data Ingestion</span>
              </div>
              <div className="flex items-center gap-4 border-b border-[#222] pb-4">
                <Activity className="w-5 h-5 text-white/40 flex-shrink-0" />
                <span className="text-base md:text-lg">Microsecond Response Time</span>
              </div>
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-5 h-5 text-[#00FF41] flex-shrink-0" />
                <span className="text-base md:text-lg text-white">Fault Tolerance Protocol</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SYSTEM FLOW */}
      <section className="flow-section w-full py-24 md:py-40 px-6 md:px-12 lg:px-24 overflow-hidden bg-[#050505]">
        <div className="text-center mb-20 md:mb-32">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">How Intelligence Flows</h2>
        </div>
        
        <div className="relative w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-16 md:gap-0">
          {[
            { label: "Weather Input", icon: <CloudLightning /> },
            { label: "AI Decision", icon: <Cpu className="text-[#00F0FF]" /> },
            { label: "Grid Command", icon: <Power /> },
            { label: "Stabilization", icon: <Zap className="text-[#00FF41]" /> }
          ].map((node, i) => (
            <React.Fragment key={i}>
              <div className="flow-node flex flex-col items-center justify-center gap-3 bg-[#111] w-24 h-24 md:w-32 md:h-32 rounded-full border border-[#222] z-10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                {node.icon}
                <span className="absolute -bottom-8 md:-bottom-10 text-[10px] md:text-xs font-bold tracking-widest uppercase whitespace-nowrap text-white/50">{node.label}</span>
              </div>
              {i < 3 && (
                <div className="hidden md:block flow-line relative flex-1 h-[1px] bg-[#333] transform origin-left scale-x-0 mx-2">
                   <div className="flow-particle absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]"></div>
                </div>
              )}
              {/* Mobile connector */}
              {i < 3 && (
                <div className="md:hidden w-[1px] h-12 bg-[#333] absolute" style={{ top: `${(i * 150) + 120}px` }}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 6. DASHBOARD PREVIEW */}
      <section className="dashboard-section w-full py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-[#0B0B0B]">
        <div className="sol-header mb-12 md:mb-16 text-center">
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">Mission Control</h3>
          <p className="mt-4 md:mt-6 text-white/40 text-base md:text-lg max-w-xl mx-auto">Unmatched visibility into local and global grid status.</p>
        </div>

        <div className="dash-wrapper w-full max-w-6xl mx-auto bg-[#000] border border-[#222] rounded-xl p-1 md:p-2 shadow-2xl overflow-hidden">
          {/* Mac-like Header */}
          <div className="w-full flex items-center justify-start gap-2 px-4 py-3 border-b border-[#222] bg-[#0A0A0A]">
            <div className="w-3 h-3 rounded-full bg-[#333]"></div>
            <div className="w-3 h-3 rounded-full bg-[#333]"></div>
            <div className="w-3 h-3 rounded-full bg-[#333]"></div>
            <div className="mx-auto text-[10px] md:text-xs font-mono text-white/30 uppercase tracking-[0.2em] hidden sm:block">G-Balancer OS v1.0.4</div>
          </div>
          
          <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 bg-[#050505]">
            {/* Stat Box */}
            <div className="dash-element col-span-1 lg:col-span-2 bg-[#111] border border-[#222] p-6 md:p-8 flex flex-col justify-between">
              <span className="text-xs md:text-sm text-white/40 uppercase tracking-widest font-bold">System Efficiency</span>
              <div className="flex items-baseline gap-2 mt-8 md:mt-12">
                <span className="dash-stat text-6xl sm:text-7xl md:text-[6rem] font-bold text-[#00FF41]">0</span>
                <span className="text-2xl md:text-3xl text-[#00FF41]">%</span>
              </div>
              <p className="mt-4 text-white/50 font-mono text-[10px] md:text-sm">Optimal performance maintained over 72hrs.</p>
            </div>
            
            {/* Circular Gauge Mock */}
            <div className="dash-element bg-[#111] border border-[#222] p-6 md:p-8 flex flex-col items-center lg:items-center sm:items-start justify-center">
               <span className="text-xs md:text-sm text-white/40 uppercase tracking-widest font-bold mb-6 md:mb-8 self-start w-full">Grid Load</span>
               <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#222" strokeWidth="8"/>
                    <circle className="dash-stroke" cx="50%" cy="50%" r="45%" fill="none" stroke="#00F0FF" strokeWidth="8" strokeDasharray="440" strokeDashoffset="440" strokeLinecap="round"/>
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center flex-col">
                   <span className="text-2xl md:text-3xl font-bold">84%</span>
                   <span className="text-[8px] md:text-[10px] text-white/40 font-mono">CAPACITY</span>
                 </div>
               </div>
            </div>

            {/* Minor Stats */}
            <div className="dash-element bg-[#111] border border-[#222] p-4 md:p-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest">Active Nodes</span>
                <div className="text-xl md:text-2xl font-semibold mt-1">1,248</div>
              </div>
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-white/30" />
            </div>
            <div className="dash-element bg-[#111] border border-[#222] p-4 md:p-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest">Anomalies Prevented</span>
                <div className="text-xl md:text-2xl font-semibold mt-1">53</div>
              </div>
              <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-[#00FF41]" />
            </div>
            <div className="dash-element bg-[#111] border border-[#222] p-4 md:p-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest">Carbon Offset</span>
                <div className="text-xl md:text-2xl font-semibold mt-1">12.4t</div>
              </div>
              <BarChart4 className="w-5 h-5 md:w-6 md:h-6 text-[#00F0FF]" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. FEATURES SECTION */}
      <section className="features-section w-full py-24 md:py-32 px-6 md:px-12 lg:px-24 border-t border-[#1a1a1a]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 relative">
          <div className="absolute inset-0 bg-[#222] pointer-events-none" style={{ gap: "1px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}></div>
          
          {[
            { title: "Dynamic Throttling", desc: "Instantly adjust draw based on real-time availability." },
            { title: "Sub-Second Polling", desc: "Data sampled and analyzed at 1000Hz for incredible accuracy." },
            { title: "Zero Setup Infrastructure", desc: "API-first integration drops right into current grid software." },
            { title: "Forecasting Engines", desc: "Deep multi-layer recurrent nets predict grid demands." },
            { title: "Cryptographic Security", desc: "Every command is signed and verified on a private ledger." },
            { title: "Hardware Agnostic", desc: "Works with Tesla, Siemens, and custom SCADA systems." },
          ].map((feat, i) => (
            <div key={i} className="feature-card bg-[#0B0B0B] p-8 md:p-12 hover:bg-[#111] transition-colors cursor-crosshair group relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-10 md:mb-16 group-hover:bg-white group-hover:text-black transition-colors">
                <Maximize className="w-4 h-4" />
              </div>
              <h4 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">{feat.title}</h4>
              <p className="text-white/40 font-light text-sm md:text-base leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. IMPACT (Footer) */}
      <section className="impact-section w-full py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-[#00FF41] text-black flex flex-col items-center justify-center text-center relative overflow-hidden">
        <h2 className="impact-text text-[15vw] sm:text-7xl md:text-8xl lg:text-[10rem] font-bold leading-[0.85] tracking-tighter">
          Power the <br /> Future.
        </h2>
        <div className="mt-12 md:mt-16 text-base md:text-xl font-medium max-w-lg mx-auto opacity-80">
          Join the protocol that balances the world.
        </div>
        <button className="mt-8 md:mt-12 px-8 md:px-12 py-4 md:py-5 bg-black text-white font-bold uppercase tracking-widest text-xs md:text-sm hover:scale-105 transition-transform will-change-transform rounded-full">
          Initialize System
        </button>

        {/* Minimal Footer Info */}
        <div className="absolute bottom-6 md:bottom-8 w-full flex flex-col sm:flex-row gap-4 justify-between items-center px-6 md:px-12 lg:px-24 left-0">
          <span className="text-[10px] md:text-xs uppercase font-bold tracking-widest opacity-50">© 2026 G-Balancer</span>
          <span className="text-[10px] md:text-xs uppercase font-bold tracking-widest opacity-50">System OK</span>
        </div>
      </section>

    </div>
  );
}
