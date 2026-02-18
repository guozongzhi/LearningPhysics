"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

type KnowledgeRadarProps = {
  data: {
    subject: string;
    score: number;
    fullMark: number;
  }[];
}

export function KnowledgeRadar({ data }: KnowledgeRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={30} domain={[0, 100]} />
        <Radar 
          name="Mastery" 
          dataKey="score" 
          stroke="hsl(var(--primary))" 
          fill="hsl(var(--primary))" 
          fillOpacity={0.6} 
        />
        <Tooltip contentStyle={{
          backgroundColor: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
        }}/>
      </RadarChart>
    </ResponsiveContainer>
  )
}
