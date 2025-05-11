"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircleCode,MessageSquare, Users, Bot, Zap, Expand } from "lucide-react"
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { LineChartProps, BarChartProps } from "@tremor/react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { ChartModal } from "./chart-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const timeRangeOptions = [
  { label: "Last 7 Days", value: "7days" },
  { label: "Last 14 Days", value: "14days" },
  { label: "Last 30 Days", value: "30days" },
] as const

interface StatsData {
  totalConversations: number
  totalUsers: number
  totalMessages: number
  activePersonas: number
  messagesByDate: { date: string; count: number }[]
  personaUsage: { name: string; usage: number }[]
  messagesPerConversation: { conversation: string; messages: number }[]
}

type TimeRange = "7days" | "14days" | "30days"

export function OverviewSection() {
  const [messagesTimeRange, setMessagesTimeRange] = useState<TimeRange>("7days")
  const [personasTimeRange, setPersonasTimeRange] = useState<TimeRange>("7days")
  const [expandedChart, setExpandedChart] = useState<"messages" | "personas" | null>(null)

  const { data: stats, isLoading, error, refetch } = useQuery<StatsData>({
    queryKey: ["adminStats", "30days"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/stats?timeRange=30days`, {
        credentials: 'include', 
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch admin stats")
      }
      
      return response.json()
    },
    retry: 1, 
    retryDelay: 1000, 
  })

  useEffect(() => {
    if (sessionStorage.getItem('justLoggedIn')) {
      sessionStorage.removeItem('justLoggedIn')
      refetch()
    }
  }, [refetch])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-[120px]" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-[100px] mb-2" />
              <Skeleton className="h-5 w-[160px]" />
            </CardContent>
          </Card>
        ))}
        <div className="col-span-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-[200px]" /></CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-[200px]" /></CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-center">
        <p className="text-red-500 mb-2">Error loading stats</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) return null;

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM d')
  }

  const chartConfig = {
    messages: {
      label: "Messages",
      color: "hsl(var(--primary))",
    },
  }

  const personaChartConfig = {
    usage: {
      label: "Usage",
      color: "hsl(var(--primary))",
    },
  }

  const getTimeRangeData = (data: any[], range: TimeRange) => {
    const ranges = {
      "7days": 7,
      "14days": 14,
      "30days": 30
    }
    return data.slice(-ranges[range])
  }

  const formattedData = getTimeRangeData(
    stats.messagesByDate.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      messages: item.count
    })),
    messagesTimeRange
  )

  const formattedPersonaData = getTimeRangeData(
    stats.personaUsage
      .sort((a, b) => b.usage - a.usage)
      .map(item => ({
        name: item.name,
        usage: item.usage
      })),
    personasTimeRange
  )

  const cards = [
    {
      title: "Total Conversations",
      value: stats.totalConversations,
      icon: MessageCircleCode 
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users
    },
    {
      title: "Total Messages",
      value: stats.totalMessages,
      icon: MessageSquare
    },
    {
      title: "Active Personas",
      value: stats.activePersonas,
      icon: Bot
    }
  ]

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="col-span-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Messages Over Time</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={messagesTimeRange}
                onValueChange={(value: TimeRange) => setMessagesTimeRange(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpandedChart("messages")}
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[320px] p-4">
            <div className="w-full h-full">
              <ChartContainer config={chartConfig}>
                <LineChart
                  data={formattedData}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis 
                    dataKey="date" 
                    hide
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={30}
                    tick={{ fontSize: 13, fill: '#888' }}
                    domain={[0, 'auto']}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    stroke="var(--color-messages)"
                    strokeWidth={2.5}
                    dot={{ fill: "var(--color-messages)", r: 5, strokeWidth: 0 }}
                    activeDot={{ r: 7, fill: "var(--color-messages)" }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Persona Usage</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={personasTimeRange}
                onValueChange={(value: TimeRange) => setPersonasTimeRange(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpandedChart("personas")}
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[320px] p-4">
            <div className="w-full h-full">
              <ChartContainer config={personaChartConfig}>
                <BarChart
                  data={formattedPersonaData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  barSize={48}
                  maxBarSize={500}
                >
                  <XAxis 
                    type="number" 
                    hide
                    domain={[0, 'dataMax + 10']}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    width={110}
                    tick={{ fontSize: 14, fill: '#888' }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar 
                    dataKey="usage" 
                    fill="var(--color-usage)" 
                    radius={8}
                    background={{ fill: "hsl(var(--muted))", radius: 8 }}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {expandedChart === "messages" ? (
        <Dialog open={expandedChart === "messages"} onOpenChange={() => setExpandedChart(null)}>
          <DialogContent className="max-w-5xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Messages Over Time</DialogTitle>
            </DialogHeader>
            <div className="flex-1 h-full">
              <ChartContainer config={chartConfig}>
                <LineChart
                  data={formattedData}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis 
                    dataKey="date" 
                    hide
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={30}
                    tick={{ fontSize: 13, fill: '#888' }}
                    domain={[0, 'auto']}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    stroke="var(--color-messages)"
                    strokeWidth={2.5}
                    dot={{ fill: "var(--color-messages)", r: 5, strokeWidth: 0 }}
                    activeDot={{ r: 7, fill: "var(--color-messages)" }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {expandedChart === "personas" ? (
        <Dialog open={expandedChart === "personas"} onOpenChange={() => setExpandedChart(null)}>
          <DialogContent className="max-w-5xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Persona Usage</DialogTitle>
            </DialogHeader>
            <div className="flex-1 h-full">
              <ChartContainer config={personaChartConfig}>
                <BarChart
                  data={formattedPersonaData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  barSize={48}
                  maxBarSize={500}
                >
                  <XAxis 
                    type="number" 
                    hide
                    domain={[0, 'dataMax + 10']}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    width={110}
                    tick={{ fontSize: 14, fill: '#888' }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar 
                    dataKey="usage" 
                    fill="var(--color-usage)" 
                    radius={8}
                    background={{ fill: "hsl(var(--muted))", radius: 8 }}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
