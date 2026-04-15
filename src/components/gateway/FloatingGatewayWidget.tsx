import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Minimize2, Maximize2, X, Move, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const FloatingGatewayWidget = () => {
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        let newX = e.clientX - dragOffset.current.x;
        let newY = e.clientY - dragOffset.current.y;

        // Boundary checks
        newX = Math.max(0, Math.min(newX, window.innerWidth - (isMinimized ? 60 : 300)));
        newY = Math.max(0, Math.min(newY, window.innerHeight - (isMinimized ? 60 : 180)));

        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isMinimized]);

  return (
    <div
      ref={widgetRef}
      style={{ left: position.x, top: position.y }}
      className={cn(
        "fixed z-[100] transition-shadow duration-200 select-none",
        isDragging ? "cursor-grabbing shadow-2xl" : "cursor-default shadow-xl"
      )}
    >
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          onMouseDown={handleMouseDown}
          className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-amber-400/50"
          title="Open Participant Gateway POC"
        >
          <Zap className="w-6 h-6 animate-pulse" />
        </button>
      ) : (
        <div className="w-[280px] bg-[#0f1624] border border-[#1e2d44] rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
          {/* Header/Grab Bar */}
          <div 
            onMouseDown={handleMouseDown}
            className="h-10 bg-[#16213a] border-b border-[#1e2d44] flex items-center justify-between px-3 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500/80">POC Gateway</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                className="p-1 hover:bg-white/5 rounded text-[#5a6a82] hover:text-white transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
             <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">Demo Participant Flow</h4>
                <p className="text-[10px] text-[#5a6a82] leading-relaxed">
                  Fast-track to the zero-install participant experience using a Unique Key.
                </p>
             </div>
             
             <button
                onClick={() => navigate("/gateway")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
             >
                Launch Gateway
                <ExternalLink className="w-3 h-3" />
             </button>

             <div className="flex items-center justify-between text-[9px] text-[#3a4a62] font-mono pt-1">
                <span>PORTAL::GATEWAY</span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> READY
                </span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
