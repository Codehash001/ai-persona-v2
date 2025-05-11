import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { DashboardShell } from "@/components/admin/dashboard-shell"
import { LoginDialog } from "@/components/admin/login-dialog"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <LoginDialog />
      <DashboardShell>{children}</DashboardShell>
    </>
  )
}

function Sidebar({ className }: SidebarProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-4">
          <Link href="/admin">
            <Button
              variant="ghost"
              className="w-full justify-start"
            >
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/conversations">
            <Button
              variant="ghost"
              className="w-full justify-start"
            >
              Conversations
            </Button>
          </Link>
          <Link href="/admin/personas">
            <Button
              variant="ghost"
              className="w-full justify-start"
            >
              Personas
            </Button>
          </Link>
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <form action="/api/admin/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  )
}
