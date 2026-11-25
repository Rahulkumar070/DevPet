"use client";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface HPBarProps {
  current: number;
  max: number;
  name: string;
  color?: string;
}

export function HPBar({ current, max, color }: HPBarProps) {
  const prevCurrentRef = useRef(current);
  const damageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const damageElementRef = useRef<HTMLDivElement>(null);

  const percent = Math.max(0, (current / max) * 100);
  const barColor =
    percent > 60 ? "#16a34a" : percent > 30 ? "#eab308" : "#dc2626";

  useEffect(() => {
    if (current < prevCurrentRef.current && damageElementRef.current) {
      // Show damage flash via DOM manipulation instead of state
      damageElementRef.current.style.opacity = "1";
      
      if (damageTimeoutRef.current) {
        clearTimeout(damageTimeoutRef.current);
      }
      damageTimeoutRef.current = setTimeout(() => {
        if (damageElementRef.current) {
          damageElementRef.current.style.opacity = "0";
        }
      }, 300);
    }
    prevCurrentRef.current = current;
    
    return () => {
      if (damageTimeoutRef.current) {
        clearTimeout(damageTimeoutRef.current);
      }
    };
  }, [current]);

  return (
    <div className="mt-3 relative">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">HP</span>
        <span>
          {current}/{max}
        </span>
      </div>
      <div className="h-3 bg-edge rounded-full overflow-hidden relative">
        <div
          ref={damageElementRef}
          className="absolute inset-0 bg-red-500/50 transition-opacity duration-300"
          style={{ opacity: 0 }}
        />
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color || barColor }}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        />
      </div>
    </div>
  );
}
