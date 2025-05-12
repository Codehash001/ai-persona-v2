"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { CreatePersonaDialog } from "./create-persona-dialog"
import { OverviewSection } from "./overview-section"
import { BaseInstructionsTab } from "./base-instructions-tab"
import { ThemeToggle } from "../theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AdminDashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="flex flex-col">
      <main className="container">
        <Tabs 
          defaultValue="overview" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="base-instructions">Base Instructions</TabsTrigger>
            </TabsList>
            
            {activeTab === "overview" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Persona
              </Button>
            )}
          </div>
          
          <TabsContent value="overview" className="mt-0">
            <OverviewSection />
          </TabsContent>
          
          <TabsContent value="base-instructions" className="mt-0">
            <BaseInstructionsTab />
          </TabsContent>
        </Tabs>
      </main>

      <CreatePersonaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}
