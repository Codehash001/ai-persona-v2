"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, User, PlusCircle, LogOut, DoorOpen } from "lucide-react"
import { useChat, Message } from 'ai/react'
import { ThemeToggle } from "@/components/theme-toggle"
import ReactMarkdown from 'react-markdown'
import { z } from "zod"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

type Role = 'system' | 'user' | 'assistant' | 'data'

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores (_) and hyphens (-)"
  )

interface AIResponse extends Message {
  conversationId?: string
}

export function ChatInterface() {
  const { toast } = useToast()
  const [username, setUsername] = useState<string>('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [showConsentPopup, setShowConsentPopup] = useState(true)
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [exitChatModalText, setExitChatModalText] = useState(
    "Thank you for participating in this research study. Your conversation will be recorded for research purposes."
  )
  // Generate a deterministic color based on username to ensure consistency
  const generateAvatarColor = useCallback((name: string) => {
    // If no username yet, use a default color
    if (!name) return `hsl(210, 70%, 85%)`
    
    // Generate a hash from the username
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to a hue (0-360)
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  }, [])
  
  // Update color when username changes
  const [avatarColor, setAvatarColor] = useState(`hsl(210, 70%, 85%)`)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [aiMessages, setAiMessages] = useState<AIResponse[]>([])
  
  // Define scrollToBottom before it's used
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      username,
      conversationId
    },
    onResponse: async (response) => {
      if (response.ok) {
        try {
          const data = await response.json()
          console.log('Response data:', data)
          // Ensure the message has a timestamp
          const messageWithTimestamp = {
            ...data,
            createdAt: data.createdAt || new Date().toISOString()
          }
          setAiMessages(prev => {
        const newMessages = [...prev, messageWithTimestamp];
        // Schedule a scroll after state update
        setTimeout(scrollToBottom, 100);
        return newMessages;
      })
          if (!conversationId && data.conversationId) {
            setConversationId(data.conversationId)
          }
        } catch (error) {
          console.error('Error parsing response:', error)
        }
      }
    },
    onFinish: (message: AIResponse) => {
      console.log('Message finished:', message)
      scrollToBottom()
    }
  })

  // Format timestamp safely
  const formatMessageTime = (timestamp: Date | string | undefined) => {
    if (!timestamp) return formatTime(new Date())
    return formatTime(new Date(timestamp))
  }

  // Combine user messages with AI responses in chronological order
  const allMessages = useMemo(() => {
    // Add timestamps to messages if they don't have one
    const messagesWithTimestamps = messages.map(msg => ({
      ...msg,
      createdAt: msg.createdAt || new Date().toISOString()
    }))
    
    // Combine all messages into a single array
    const combined = [...messagesWithTimestamps, ...aiMessages]
    
    // Sort messages by timestamp
    return combined.sort((a, b) => {
      const timeA = new Date(a.createdAt || new Date()).getTime()
      const timeB = new Date(b.createdAt || new Date()).getTime()
      if (timeA === timeB) {
        return a.role === 'user' ? -1 : 1
      }
      return timeA - timeB
    })
  }, [messages, aiMessages])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [allMessages])

  useEffect(() => {
    console.log('Current messages:', allMessages)
  }, [allMessages])

  // Fetch exit chat modal text from settings
  useEffect(() => {
    const fetchExitChatModalText = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.exitChatModalText) {
            setExitChatModalText(data.exitChatModalText)
          }
        }
      } catch (error) {
        console.error('Error fetching exit chat modal text:', error)
      }
    }

    fetchExitChatModalText()
  }, [])
  
  // Clear user session on page load/refresh
  useEffect(() => {
    // This will run on every page load/refresh
    const clearUserSession = () => {
      // Clear localStorage items related to user session
      localStorage.removeItem('username')
      localStorage.removeItem('consentGiven')
      
      // Reset state
      setUsername('')
      setShowConsentPopup(true)
      setShowUsernameModal(false)
      setConversationId(null)
      setAiMessages([])
    }
    
    clearUserSession()
    
    // Register beforeunload event to ensure session is cleared even on hard refreshes
    const handleBeforeUnload = () => {
      clearUserSession()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleNewChat = useCallback(() => {
    setAiMessages([])
    setConversationId(null)
    window.location.reload()
  }, [])

  useEffect(() => {
    console.log('Current messages:', messages)
  }, [messages])

  // We've removed the code that restores the session from localStorage
  // as we want users to completely log out on page refresh

  const handleConsentSubmit = (agree: boolean) => {
    if (agree) {
      localStorage.setItem('consentGiven', 'true')
      setShowConsentPopup(false)
      setShowUsernameModal(true)
    } else {
      // User does not consent, show a toast notification
      toast({
        variant: "destructive",
        title: "Consent Required",
        description: "You must consent to participate in the research study to continue.",
      })
    }
  }

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      usernameSchema.parse(username)
      setUsernameError(null)
      localStorage.setItem('username', username)
      // Update avatar color based on the username
      setAvatarColor(generateAvatarColor(username))
      setShowUsernameModal(false)
    } catch (error) {
      if (error instanceof z.ZodError) {
        setUsernameError(error.errors[0].message)
      }
    }
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return ''
    
    // Get first two characters of the name
    return name.slice(0, 2).toUpperCase()
  }

  // Function moved to before it's used

  // Simulate typing effect with delay based on message length
  // This helps make the AI responses feel more natural
  const calculateTypingDelay = (text: string) => {
    const baseDelay = 500 // minimum delay in ms
    const charsPerSecond = 20 // how many characters per second
    
    return Math.max(baseDelay, (text.length / charsPerSecond) * 1000)
  }
  
  const retry = () => {
    const lastUserMessage = messages
      .filter(message => message.role === 'user')
      .pop()
    
    if (lastUserMessage) {
      // TODO: Implement retry logic
    }
  }
  
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date)
  }
  
  const handleNewConversation = () => {
    // Show the new conversation confirmation dialog
    setShowNewConversationDialog(true)
  }
  
  const confirmNewConversation = () => {
    // Close the dialog and start a new chat
    setShowNewConversationDialog(false)
    handleNewChat()
  }
  
  const handleEndConversation = () => {
    // Show the confirmation dialog
    setShowEndDialog(true)
  }
  
  const confirmEndConversation = () => {
    // Clear local storage and reload the page
    localStorage.removeItem('username')
    localStorage.removeItem('consentGiven')
    window.location.reload()
  }

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto">
      {/* Consent Popup */}
      {showConsentPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Before You Begin...</h2>
            <p className="mb-4 text-black/80 dark:text-white/80">You are about to join a research study testing a new communication platform. <span className="font-semibold">On your side, this is a regular text chat.</span> However, the remote agent you'll chat with is using speech-to-text technology - this is why their replies may appear very quickly.</p>
            <p className="mb-4 text-black/80 dark:text-white/80">Your task is to discuss ideas for a community event combining art, technology, and social impact. <span className="font-semibold">Feel free to chat naturally and explore any ideas that come to mind.</span> The conversation should last at least 30 minutes.</p>
            <p className="mb-4 text-black/80 dark:text-white/80">Your chat will be recorded for research purposes, but it will not be monitored in real-time.</p>
            <p className="mb-4 text-black/80 dark:text-white/80">Please confirm you understand before continuing:</p>
            <div className="flex flex-col gap-3 mt-6">
              <Button 
                onClick={() => handleConsentSubmit(true)} 
                className="flex-1 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90"
              >
                I understand and agree to take part.
              </Button>
              <Button 
                onClick={() => handleConsentSubmit(false)} 
                variant="outline" 
                className="flex-1 border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
              >
                I do not agree to take part.
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Choose a username</h2>
            <p className="mb-4 text-black/60 dark:text-white/60">This will be displayed with your messages.</p>
            <form onSubmit={handleUsernameSubmit}>
              <div className="space-y-4">
                <div>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="bg-transparent border-black/10 dark:border-white/10"
                  />
                  {usernameError && (
                    <p className="text-red-500 text-sm mt-1">{usernameError}</p>
                  )}
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90"
                >
                  Continue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleNewConversation}
            className="rounded-xl text-sm"
          >
            <PlusCircle className="h-5 w-5 text-black dark:text-white" />
            New Conversation
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Popover>
            <PopoverTrigger asChild>
            <div 
                    className="flex flex-shrink-0 h-8 w-8 rounded-full items-center justify-center shadow-sm cursor-pointer text-xs font-semibold"
                    style={{ 
                      backgroundColor: avatarColor,
                      color: 'black'
                    }}
                  >
                    {getInitials(username)}
                  </div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Signed in as</p>
                <div className="flex items-center gap-2">
                  <div 
                    className="flex flex-shrink-0 h-8 w-8 rounded-full items-center justify-center shadow-sm"
                    style={{ 
                      backgroundColor: avatarColor,
                      color: 'black'
                    }}
                  >
                    {getInitials(username)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{username}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-black/10 dark:border-white/10"
                  onClick={() => {
                    localStorage.removeItem('username')
                    localStorage.removeItem('consentGiven')
                    window.location.reload()
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Chat Messages */}
      {allMessages.length === 0 ? (
        <div className="flex-1 overflow-hidden text-center">
          <div className="flex flex-col items-center justify-center h-full">
        <p className="text-black/50 dark:text-white/50 text-xs">No messages yet. Start a conversation.</p>
        </div>
      </div>
      )
    
    :(

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 p-4">
            {allMessages.map((message, index) => (
              <div
              key={index}
              className={`flex items-end gap-2 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              } animate-in slide-in-from-bottom duration-300`}
            >
                {message.role !== 'user' ? (
                  <div className="flex flex-shrink-0 h-8 w-8 rounded-full items-center justify-center bg-transparent border border-black/10 dark:border-white/10 shadow-sm">
                    <User className="h-5 w-5 text-black dark:text-white" />
                  </div>
                ) : (
                  <div 
                    className="flex flex-shrink-0 h-8 w-8 rounded-full items-center justify-center shadow-sm text-xs font-semibold"
                    style={{ 
                      backgroundColor: avatarColor,
                      color: 'black'
                    }}
                  >
                    {getInitials(username)}
                  </div>
                )}
                <div className="flex flex-col">
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-full break-words shadow-sm prose-sm
                      ${message.role === 'user'
                        ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-none border border-black/10 dark:border-white/10 prose-headings:text-white dark:prose-headings:text-black prose-p:text-white/90 dark:prose-p:text-black/90' 
                        : 'bg-transparent text-black dark:text-white rounded-bl-none border border-black/10 dark:border-white/10 prose-headings:text-black dark:prose-headings:text-white prose-p:text-black/90 dark:prose-p:text-white/90'
                      }
                    `}
                  >
                    <ReactMarkdown className="prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <span className={`text-xs text-black/60 dark:text-white/60 mt-1 ${
                    message.role === 'user' ? 'text-right mr-2' : 'ml-2'
                  }`}>
                    {message.role === 'user' ? username : 'stranger'} • {formatMessageTime(message.createdAt)}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2">
                <div className="flex flex-shrink-0 h-8 w-8 rounded-full items-center justify-center bg-transparent border border-black/10 dark:border-white/10 shadow-sm">
                  <User className="h-5 w-5 text-black dark:text-white" />
                </div>
                <div className="flex flex-col">
                  <div className="px-4 py-2 rounded-2xl rounded-bl-none bg-transparent border border-black/10 dark:border-white/10 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20 animate-bounce"></span>
                    </div>
                  </div>
                  <span className="text-xs text-black/60 dark:text-white/60 mt-1 ml-2">
                    typing...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

    )}
      

      {/* {allMessages.length === 0 && (
        <div className="p-2 text-center">
          <p className="text-black/50 dark:text-white/50">No messages yet. Start a conversation!</p>
        </div>
      )} */}
      
      {/* End Conversation Button */}
      <div className="flex justify-end px-3 mt-2 mb-1">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleEndConversation}
          className="h-8 rounded-lg border border-gray-200 bg-white/80 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/80 dark:hover:bg-gray-800/80 transition-colors"
        >
          <DoorOpen className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">End <span className='hidden sm:inline'>Conversation</span> & Log Out</span>
        </Button>
      </div>
      
      {/* End Conversation Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="sm:max-w-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle>End Conversation</DialogTitle>
            <DialogDescription className="pt-2">
              {exitChatModalText}
              <p className="mt-2">Are you sure you want to end this conversation and log out?</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              onClick={confirmEndConversation}
              className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90"
            >
              Okay, End Conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Conversation Dialog */}
      <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-lg">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to start a new conversation? This will clear your current chat.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <div className="flex w-full gap-3">
              <Button 
                variant="outline"
                onClick={() => setShowNewConversationDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmNewConversation}
                className="flex-1 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90"
              >
                OK
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Input Form */}
      <form 
        onSubmit={(e) => {
          handleSubmit(e);
          // Scroll to bottom after submitting
          setTimeout(scrollToBottom, 100);
        }}
        className="py-2 px-1  bg-transparent"
      >
        <div className="flex gap-2 max-w-7xl mx-auto rounded-xl border border-black/10 dark:border-white/10 p-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            className="flex-1 h-12 bg-transparent border-none rounded-xl px-4 sm:px-6 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button 
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 rounded-xl bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-white/90 border border-black/10 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-7 w-7 text-white dark:text-black" />
          </Button>
        </div>
      </form>
    </div>
  )
}
