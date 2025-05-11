"use client"

import * as React from "react"
import { TooltipProps } from "recharts"
import { 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts"
import { cn } from "@/lib/utils";

export interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactElement
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  return (
    <div className={cn("h-full w-full", className)} {...props}>
      <style>
        {Object.entries(config).map(([key, value]) => {
          return `
            :root {
              --color-${key}: ${value.color};
            }
          `
        })}
      </style>
      <ResponsiveContainer width="100%" height="100%">
        {React.cloneElement(children)}
      </ResponsiveContainer>
    </div>
  )
}

interface ChartTooltipContentProps extends TooltipProps<any, any> {
  hideLabel?: boolean
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
}: ChartTooltipContentProps) {
  if (!active || !payload) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      {!hideLabel && <div className="text-sm text-muted-foreground">{label}</div>}
      <div className="flex flex-col gap-0.5">
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="rounded-full px-1"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm font-medium">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ChartTooltip = Tooltip
