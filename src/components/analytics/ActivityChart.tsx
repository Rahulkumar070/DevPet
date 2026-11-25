"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function ActivityChart({ data }: { data: { date: string; commits: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={256}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="commitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#bbd2ee" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#bbd2ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#adaeb9" }}
            tickFormatter={(value) => value.slice(5)}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#adaeb9" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#26272c",
              border: "1px solid #42444b",
              borderRadius: "10px",
              color: "#f3f3f5",
            }}
          />
          <Area
            type="linear"
            dataKey="commits"
            name="Synced commits"
            stroke="#bbd2ee"
            fillOpacity={1}
            fill="url(#commitFill)"
          />
        </AreaChart>
    </ResponsiveContainer>
  );
}
