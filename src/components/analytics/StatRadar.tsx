"use client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { Stats } from "@/types";

interface StatRadarProps {
  stats: Stats;
  averageStats?: Stats;
}

export function StatRadar({ stats, averageStats }: StatRadarProps) {
  const data = Object.entries(stats).map(([stat, value]) => ({
    stat,
    value,
    average: averageStats ? averageStats[stat as keyof Stats] : 50,
  }));

  return (
    <ResponsiveContainer width="100%" height={256}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#42444b" />
          <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: "#c4c5cf" }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#c4c5cf" }}
          />
          {averageStats && (
            <Radar
              name="Average"
              dataKey="average"
              stroke="#9ca3af"
              fill="#9ca3af"
              fillOpacity={0.2}
            />
          )}
          <Radar
            name="Your Stats"
            dataKey="value"
            stroke="#bbd2ee"
            fill="#bbd2ee"
            fillOpacity={0.4}
          />
        </RadarChart>
    </ResponsiveContainer>
  );
}
