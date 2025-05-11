"use client"

import { AwaitedReactNode, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { CalendarIcon, Download, FileJson, FileText } from "lucide-react"
import { DateRange } from "react-day-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { MessageSquare } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"

type Message = {
  id: string
  role: string
  content: string
  createdAt: string
  persona?: {
    id: string
    name: string
  } | null
}

type PersonaChange = {
  timestamp: string
  from: string
  to: string
  fromPersona?: {
    id: string
    name: string
  }
  toPersona: {
    id: string
    name: string
  }
}

type Conversation = {
  id: string
  username: string
  createdAt: string
  messages: Message[]
  personaChanges: PersonaChange[]
}

type Pagination = {
  total: number
  pageCount: number
  page: number
  pageSize: number
}

export function ConversationsSection() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [date, setDate] = useState<DateRange | undefined>()
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  const { toast } = useToast()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [date, debouncedSearch])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["conversations", date?.from, date?.to, debouncedSearch, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (date?.from) params.append('startDate', date.from.toISOString())
      if (date?.to) params.append('endDate', date.to.toISOString())
      if (debouncedSearch) params.append('search', debouncedSearch)
      params.append('page', page.toString())
      params.append('pageSize', pageSize.toString())
      
      const response = await fetch("/api/conversations?" + params.toString())
      if (!response.ok) throw new Error("Failed to fetch conversations")
      return response.json()
    },
  })

  const conversations = data?.conversations || []
  const pagination = data?.pagination || { total: 0, pageCount: 0, page: 1, pageSize: 8 }

  const clearData = async () => {
    try {
      const response = await fetch("/api/conversations/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          startDate: date?.from?.toISOString(),
          endDate: date?.to?.toISOString()
        })
      })

      if (!response.ok) throw new Error("Failed to clear data")
      
      await refetch()
      setShowClearDialog(false)
      toast({
        title: "Success",
        description: "Data cleared successfully",
      })
    } catch (error) {
      console.error("Failed to clear data:", error)
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive",
      })
    }
  }

  const exportConversation = async (format: 'json' | 'csv') => {
    if (!selectedConversation) return

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          format,
          startDate: date?.from?.toISOString(),
          endDate: date?.to?.toISOString()
        })
      })

      if (!response.ok) throw new Error("Export failed")

      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 
        `conversation-${selectedConversation.id}.${format}`

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to export conversation:", error)
      toast({
        title: "Error",
        description: "Failed to export conversation",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline"
            onClick={() => {
              setDate(undefined)
              setSearchQuery("")
            }}
          >
            Reset All
          </Button>
          <Button 
            variant="outline"
            className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            onClick={() => setShowClearDialog(true)}
          >
            Clear Data
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="h-4 w-[120px] bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-[80px] bg-muted animate-pulse rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-[100px] bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No conversations found</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {date?.from || debouncedSearch
                    ? "Try adjusting your filters or start a new conversation"
                    : "Start a new conversation to see it here"}
                </p>
              </div>
            ) : (
              <>
                {conversations.map((conversation: Conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell className="font-medium">
                      {conversation.username || 'Anonymous'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {conversation.messages.length} messages
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(conversation.createdAt), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
        {conversations.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, pagination.total)} of {pagination.total} conversations
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {page} of {pagination.pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.pageCount, p + 1))}
                disabled={page >= pagination.pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Conversation with {selectedConversation?.username || 'Anonymous'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-2 mb-4">
            <Button 
              variant="default" 
              onClick={() => exportConversation('json')}
            >
              <FileJson className="h-4 w-4" />
              Export JSON
            </Button>
            <Button 
              variant="default" 
              onClick={() => exportConversation('csv')}
            >
              <FileText className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {selectedConversation?.messages.map((message: Message, index: number, messages: Message[]) => {
                // Check if this message is the first one after a persona change
                const messageTime = new Date(message.createdAt).getTime();
                const personaChange = selectedConversation.personaChanges.find((change: PersonaChange) => {
                  const changeTime = new Date(change.timestamp).getTime();
                  // Show change if it happened right before this message
                  return Math.abs(changeTime - messageTime) < 1000;
                });

                // Get current persona section
                const currentPersona = message.persona?.name || 'Default Assistant';
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const prevPersona = prevMessage?.persona?.name || 'Default Assistant';
                const personaChanged = currentPersona !== prevPersona;
                
                return (
                  <div key={message.id}>
                    {/* Show persona section divider when persona changes or at start */}
                    {(index === 0 || personaChanged) && (
                      <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-background px-2 text-muted-foreground font-semibold">
                            Using Persona: {currentPersona} 
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Message content */}
                    <div className={`p-4 rounded-lg ${
                      message.role === "assistant"
                        ? "bg-primary/10"
                        : "bg-muted"
                    }`}>
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{message.role}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(message.createdAt), 'HH:mm:ss')}
                        </span>
                      </div>
                      <p className="">
                      <ReactMarkdown className="prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {message.content}
                        </ReactMarkdown>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDialog} onOpenChange={() => setShowClearDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Data</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to clear the data?</p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" onClick={clearData}>
              Clear Data
            </Button>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
