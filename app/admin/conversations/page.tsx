"use client"

import { ConversationsSection } from "@/components/admin/conversations-section"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

export default function ConversationsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex-1">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Conversations</h2>
        </div>
        <div className="mt-8">
          <ConversationsSection />
        </div>
      </div>
    </QueryClientProvider>
  )
}
