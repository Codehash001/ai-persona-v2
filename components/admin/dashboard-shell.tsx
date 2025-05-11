"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Settings, 
  Users,
  MessageCircleCode,
  LogOut 
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      })

      if (response.ok) {
        // Force reload to clear any cached state
        window.location.href = "/admin"
      } else {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    }
  }

  const routes = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/admin"
    },
    {
      href: "/admin/personas",
      label: "Personas",
      icon: Users,
      active: pathname === "/admin/personas"
    },
    {
      href: "/admin/conversations",
      label: "Conversations",
      icon: MessageCircleCode,
      active: pathname === "/admin/conversations"
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
      active: pathname === "/admin/settings"
    }
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 z-50 flex w-64 flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-background border-r">
          <div className="flex h-16 items-center border-b px-6 font-semibold">
            Admin Dashboard
          </div>
          <nav className="flex-1 overflow-auto py-4">
            {routes.map((route) => (
              <Link key={route.href} href={route.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-6 py-2.5 text-sm font-medium",
                    route.active 
                      ? "bg-secondary text-secondary-foreground" 
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-primary"
                  )}
                >
                  <route.icon className="h-4 w-4 shrink-0" />
                  <span>{route.label}</span>
                </div>
              </Link>
            ))}
          </nav>
          <div className="border-t p-4">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-64 w-full">
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="flex h-[63px] items-center justify-between px-6">
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link 
                href="/"
                className={cn(
                  "text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                )}
              >
                Back to Site
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
