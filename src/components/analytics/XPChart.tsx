"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function XPChart({ data }: { data: { date: string; xp: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={256}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
        >
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
          <Line
            type="linear"
            dataKey="xp"
            name="Recorded XP"
            stroke="#dbbfe4"
            strokeWidth={2}
            dot={{ r: 3, fill: "#dbbfe4" }}
          />
        </LineChart>
    </ResponsiveContainer>
  );
}
