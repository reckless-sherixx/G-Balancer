import { IndiaMap } from "@/components/map/IndiaMap";

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">National Grid Topology</h1>
        <p className="text-white/50 text-sm">Real-time status of inter-regional energy transfer and load balancing.</p>
      </div>
      
      <IndiaMap />
    </div>
  );
}
