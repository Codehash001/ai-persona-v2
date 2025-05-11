import { ChatInterface } from "@/components/chat/chat-interface"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white to-gray-100 dark:from-black dark:to-gray-900">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute inset-0 bg-white/[0.02] dark:bg-black/[0.02] backdrop-blur-xl backdrop-saturate-150"></div>
      <div className="relative h-screen max-w-8xl mx-auto p-2 sm:p-6">
        <ChatInterface />
      </div>
    </main>
  )
}