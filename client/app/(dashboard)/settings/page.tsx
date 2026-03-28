"use client";

import { Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 pb-10 min-h-[calc(100vh-8rem)] max-w-4xl">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Protocol Settings</h1>
        <p className="text-white/50 text-sm max-w-xl">
          Configure API endpoints, regional targeting, and UI preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6">
         {/* Regional Config */}
         <div className="bg-[#111] border border-[#222] rounded-xl p-6 md:p-8 flex flex-col gap-6">
            <h2 className="text-lg font-bold border-b border-[#222] pb-4">Regional Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="flex flex-col gap-2">
                 <label className="text-xs uppercase font-bold tracking-widest text-white/50">Primary Grid Node</label>
                 <select className="bg-[#0A0A0A] border border-[#222] p-3 rounded-lg text-sm text-white focus:outline-none focus:border-[#00FF41]">
                   <option>Bangalore South (Alpha)</option>
                   <option>Mumbai Central</option>
                   <option>Delhi North</option>
                 </select>
               </div>
               <div className="flex flex-col gap-2">
                 <label className="text-xs uppercase font-bold tracking-widest text-white/50">Telemetry Polling Rate</label>
                 <select className="bg-[#0A0A0A] border border-[#222] p-3 rounded-lg text-sm text-white focus:outline-none focus:border-[#00FF41]">
                   <option>100ms (High Frequency)</option>
                   <option>1s (Standard)</option>
                   <option>5s (Low Power)</option>
                 </select>
               </div>
            </div>
         </div>

         {/* API Integration */}
         <div className="bg-[#111] border border-[#222] rounded-xl p-6 md:p-8 flex flex-col gap-6">
            <h2 className="text-lg font-bold border-b border-[#222] pb-4">API Endpoints</h2>
            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-2">
                 <label className="text-xs uppercase font-bold tracking-widest text-[#00F0FF]">FastAPI Backend URL</label>
                 <input 
                   type="text" 
                   defaultValue="http://localhost:8000/api/v1" 
                   className="bg-[#0A0A0A] border border-[#222] p-3 rounded-lg text-sm font-mono text-white/70 focus:outline-none focus:border-[#00F0FF]"
                 />
                 <span className="text-[10px] text-white/40 font-light">Target URL for grid state syncing and inference dispatch.</span>
               </div>
               <div className="flex flex-col gap-2">
                 <label className="text-xs uppercase font-bold tracking-widest text-[#00FF41]">Weather API Key</label>
                 <input 
                   type="password" 
                   defaultValue="r" 
                   className="bg-[#0A0A0A] border border-[#222] p-3 rounded-lg text-sm font-mono text-white/70 focus:outline-none focus:border-[#00FF41]"
                 />
               </div>
            </div>
         </div>
      </div>

      <div className="pt-4 border-t border-[#222] flex justify-end">
         <button className="bg-white text-black px-8 py-3 rounded text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-gray-200 transition-colors">
            <Save className="w-4 h-4" /> Save Configuration
         </button>
      </div>
    </div>
  );
}
