"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/utils/cn";
import { Activity, Zap, AlertTriangle, Map } from "lucide-react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const INDIA_TOPO_JSON = "https://raw.githubusercontent.com/Anujarya300/bubble_maps/master/data/geography-data/india.topo.json";

// Assign states to our mock grids for coloring
const GRID_MAP: Record<string, string> = {
  "Jammu and Kashmir": "north",
  "Himachal Pradesh": "north",
  "Punjab": "north",
  "Chandigarh": "north",
  "Uttarakhand": "north",
  "Haryana": "north",
  "Delhi": "north",
  "Uttar Pradesh": "north",

  "Rajasthan": "west",
  "Gujarat": "west",
  "Maharashtra": "west",
  "Goa": "west",
  "Madhya Pradesh": "west",
  "Chhattisgarh": "west",
  "Dadra and Nagar Haveli": "west",
  "Daman and Diu": "west",

  "Andhra Pradesh": "south",
  "Telangana": "south",
  "Karnataka": "south",
  "Kerala": "south",
  "Tamil Nadu": "south",
  "Puducherry": "south",

  "Bihar": "east",
  "Jharkhand": "east",
  "West Bengal": "east",
  "Odisha": "east",
  "Sikkim": "east",
  "Andaman and Nicobar Islands": "south",

  "Assam": "northeast",
  "Arunachal Pradesh": "northeast",
  "Meghalaya": "northeast",
  "Nagaland": "northeast",
  "Manipur": "northeast",
  "Mizoram": "northeast",
  "Tripura": "northeast",
};

type RegionData = {
  id: string;
  name: string;
  status: "deficit" | "balanced" | "surplus";
  load: number;
};

type GeoFeature = {
  rsmKey: string;
  properties: {
    ST_NM?: string;
    name?: string;
  };
};

// Mock regions mapping to data
const REGIONS: Record<string, RegionData> = {
  north: { id: "north", name: "Northern Grid", status: "deficit", load: 92 },
  west: { id: "west", name: "Western Grid", status: "balanced", load: 75 },
  south: { id: "south", name: "Southern Grid", status: "surplus", load: 60 },
  east: { id: "east", name: "Eastern Grid", status: "balanced", load: 82 },
  northeast: { id: "northeast", name: "North-Eastern Grid", status: "surplus", load: 45 },
};

export function IndiaMap() {
  const container = useRef<HTMLDivElement>(null);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

  useGSAP(() => {
    // Optional GSAP animations for the map paths
    gsap.from(".map-geography", {
      opacity: 0,
      scale: 0.95,
      duration: 1.5,
      stagger: 0.02,
      ease: "power3.out",
    });
  }, { scope: container });

  const getStatusColor = (status: string, opacity: number = 1) => {
    switch (status) {
      case "surplus": return `rgba(0, 255, 65, ${opacity})`; // Green
      case "deficit": return `rgba(255, 51, 51, ${opacity})`; // Red
      case "balanced": return `rgba(255, 215, 0, ${opacity})`; // Yellow
      default: return `rgba(51, 51, 51, ${opacity})`;
    }
  };

  const handleStateClick = (geo: GeoFeature) => {
    const stateName = geo.properties.ST_NM || geo.properties.name;
    const gridId = GRID_MAP[stateName] || "east"; // fallback
    setActiveRegionId(gridId);
  };

  const activeRegion = activeRegionId ? REGIONS[activeRegionId] ?? null : null;

  return (
    <div ref={container} className="w-full h-full flex flex-col lg:flex-row gap-6 relative">
      {/* Map Container */}
      <div className="flex-1 bg-[#111] border border-[#222] rounded-xl relative overflow-hidden flex items-center justify-center p-4">
        
        <div className="w-full h-full max-h-[700px]">
          <ComposableMap 
            projection="geoMercator" 
            projectionConfig={{ scale: 1000, center: [80, 22] }}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={INDIA_TOPO_JSON}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const typedGeo = geo as GeoFeature;
                  const stateName = typedGeo.properties.ST_NM || typedGeo.properties.name;
                  const gridId = GRID_MAP[stateName] || "east";
                  const regionData = REGIONS[gridId] ?? REGIONS.east;
                  
                  return (
                    <Geography
                      key={typedGeo.rsmKey}
                      geography={typedGeo}
                      onClick={() => handleStateClick(typedGeo)}
                      className="map-geography transition-all duration-300 cursor-pointer outline-none"
                      style={{
                        default: {
                          fill: getStatusColor(regionData.status, 0.5),
                          stroke: "#222",
                          strokeWidth: 0.5,
                          outline: "none",
                        },
                        hover: {
                          fill: getStatusColor(regionData.status, 0.8),
                          stroke: "#fff",
                          strokeWidth: 1,
                          outline: "none",
                        },
                        pressed: {
                          fill: getStatusColor(regionData.status, 1),
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-[#080808] border border-[#222] px-4 py-3 rounded-md flex flex-col gap-2 z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00FF41]"></div>
            <span className="text-xs font-mono uppercase text-white/70">Surplus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFD700]"></div>
            <span className="text-xs font-mono uppercase text-white/70">Balanced</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF3333]"></div>
            <span className="text-xs font-mono uppercase text-white/70">Deficit</span>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className={cn(
        "w-full lg:w-[400px] bg-[#111] border border-[#222] rounded-xl p-6 transition-all duration-500 flex flex-col gap-6",
        activeRegion ? "opacity-100 translate-x-0" : "opacity-50 lg:translate-x-4 pointer-events-none"
      )}>
        {activeRegion ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">{activeRegion.name}</h3>
                <div className={cn("px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded border", 
                  activeRegion.status === "deficit" ? "text-red-500 border-red-500/30 bg-red-500/10" :
                  activeRegion.status === "surplus" ? "text-[#00FF41] border-[#00FF41]/30 bg-[#00FF41]/10" :
                  "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                )}>
                  {activeRegion.status}
                </div>
              </div>
              <p className="text-sm font-light text-white/50 border-b border-[#222] pb-6">Real-time telemetry established.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0A0A0A] border border-[#222] p-4 rounded-lg flex flex-col gap-2">
                <Activity className="w-4 h-4 text-white/30" />
                <span className="text-[10px] uppercase tracking-widest text-white/40">Current Load</span>
                <span className="text-2xl font-mono">{activeRegion.load}%</span>
              </div>
              <div className="bg-[#0A0A0A] border border-[#222] p-4 rounded-lg flex flex-col gap-2">
                <Zap className="w-4 h-4 text-white/30" />
                <span className="text-[10px] uppercase tracking-widest text-white/40">Generation</span>
                <span className="text-2xl font-mono">1.2 GW</span>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#222] p-4 rounded-lg flex flex-col gap-4">
               <div>
                 <div className="flex justify-between text-xs mb-1 uppercase font-mono text-white/60">
                   <span>Battery Reserve</span>
                   <span>42%</span>
                 </div>
                 <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
                   <div className="h-full bg-white w-[42%]"></div>
                 </div>
               </div>
            </div>
            
            {activeRegion.status === "deficit" && (
              <div className="mt-auto bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-red-500 mb-1">Load Shedding Risk</h4>
                  <p className="text-xs text-red-500/70 font-light leading-relaxed">System automating discharge protocols from Central Grid.</p>
                </div>
              </div>
            )}
            {activeRegion.status === "surplus" && (
              <div className="mt-auto bg-[#00FF41]/10 border border-[#00FF41]/20 p-4 rounded-lg">
                 <p className="text-xs text-[#00FF41]/80 font-mono uppercase text-center tracking-widest">Routing 400MW to Northern Grid</p>
              </div>
            )}
            
            <button className="w-full py-3 bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors mt-2">
              Isolate Grid
            </button>
          </>
        ) : (
          <div className="h-full flex items-center justify-center flex-col gap-4 text-white/30">
            <Map className="w-12 h-12" />
            <p className="text-sm uppercase tracking-widest">Select region for telemetry</p>
          </div>
        )}
      </div>
    </div>
  );
}
