"use client"

import { useState, useEffect } from "react"
import { BaseInstructionsTab } from "./base-instructions-tab"
import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bot, Zap, MessageSquare, FileText } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

interface Persona {
  id: string
  name: string
  systemPrompt: string
  isActive: boolean
}

interface Settings {
  id: string
  temperature: number
  maxTokens: number
  rotationInterval: number
  selectedPersonaId: string | null
  modelName: string
  exitChatModalText?: string
}

const defaultSettings: Settings = {
  id: "1",
  temperature: 0.7,
  maxTokens: 1000,
  rotationInterval: 360,
  selectedPersonaId: null,
  modelName: "gpt-4o",
  exitChatModalText: "Thank you for participating in this research study. Your conversation will be recorded for research purposes."
}

const availableModels = [
  { id: "gpt-4-0125-preview", name: "GPT-4 Turbo" },
  { id: "gpt-4", name: "GPT-4" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  {id: "gpt-4.1", name: "GPT-4.1"}
]

export function SettingsSection() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [baseInstructions, setBaseInstructions] = useState<string>("") 
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const { data: personas = [], isLoading: personasLoading } = useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      const response = await fetch("/api/personas")
      if (!response.ok) throw new Error("Failed to fetch personas")
      return response.json()
    }
  })

  const { data: currentSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings")
      if (!response.ok) throw new Error("Failed to fetch settings")
      const data = await response.json()
      setSettings(data) // Update local state with fetched settings
      return data
    }
  })

  const isLoading = personasLoading || settingsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-[250px] mb-2" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <Skeleton className="h-10 w-[120px]" />
        </div>

        <Tabs defaultValue="persona" className="space-y-6">
          <TabsList>
            <TabsTrigger value="persona" className="space-x-2" disabled>
              <Bot className="h-4 w-4" />
              <span>Persona</span>
            </TabsTrigger>
            <TabsTrigger value="model" className="space-x-2" disabled>
              <Zap className="h-4 w-4" />
              <span>Model</span>
            </TabsTrigger>
            <TabsTrigger value="end-pop-up" className="space-x-2" disabled>
              <MessageSquare className="h-4 w-4" />
              <span>End Pop-up</span>
            </TabsTrigger>
            <TabsTrigger value="base-instructions" className="space-x-2" disabled>
              <FileText className="h-4 w-4" />
              <span>Base Instructions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="persona" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle><Skeleton className="h-6 w-[150px]" /></CardTitle>
                <CardDescription>
                  <Skeleton className="h-4 w-[200px]" />
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Active Persona</Label>
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Label>Rotation Interval (minutes)</Label>
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle><Skeleton className="h-6 w-[150px]" /></CardTitle>
                <CardDescription>
                  <Skeleton className="h-4 w-[200px]" />
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      // Save main settings
      const settingsResponse = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!settingsResponse.ok) {
        const error = await settingsResponse.json()
        throw new Error(error.message)
      }
      
      // Save base instructions if they've been loaded/modified
      if (baseInstructions) {
        const instructionsResponse = await fetch("/api/admin/base-instructions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: baseInstructions }),
        })
        
        if (!instructionsResponse.ok) {
          throw new Error("Failed to update base instructions")
        }
      }

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: "There was a problem saving your settings. Please try again."
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Manage your AI assistant and model settings
          </p>
        </div>
        <Button
          onClick={saveSettings}
          disabled={isLoading || isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
      <Tabs defaultValue="persona" className="space-y-6">
        <TabsList>
          <TabsTrigger value="persona" className="space-x-2">
            <Bot className="h-4 w-4" />
            <span>Persona</span>
          </TabsTrigger>
          <TabsTrigger value="model" className="space-x-2">
            <Zap className="h-4 w-4" />
            <span>Model</span>
          </TabsTrigger>
          <TabsTrigger value="end-pop-up" className="space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>End Pop-up</span>
          </TabsTrigger>
          <TabsTrigger value="base-instructions" className="space-x-2">
            <FileText className="h-4 w-4" />
            <span>Base Instructions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="persona" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Persona Settings</CardTitle>
              <CardDescription>
                Configure persona-related settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Active Persona</Label>
                <Select
                  value={settings.selectedPersonaId || ""}
                  onValueChange={(value) =>
                    setSettings({ ...settings, selectedPersonaId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {personas.map((persona: Persona) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rotation Interval (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.rotationInterval}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rotationInterval: parseInt(e.target.value) || 360,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  How often to automatically switch between personas (in minutes)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Settings</CardTitle>
              <CardDescription>
                Configure AI model and its behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={settings.modelName}
                  onValueChange={(value) =>
                    setSettings({ ...settings, modelName: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select the AI model to use for generating responses
                </p>
              </div>

              <div className="space-y-2">
                <Label>Temperature ({settings.temperature})</Label>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={[settings.temperature]}
                  onValueChange={([value]) =>
                    setSettings({ ...settings, temperature: value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Controls randomness: Lower values make the output more focused and deterministic
                </p>
              </div>

              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={settings.maxTokens}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxTokens: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                  max={4000}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of tokens to generate in the response
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="end-pop-up" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>End Pop-up Settings</CardTitle>
              <CardDescription>
                Configure text messages shown to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Exit Chat Modal Text</Label>
                <Textarea
                  value={settings.exitChatModalText || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, exitChatModalText: e.target.value })
                  }
                  placeholder="Enter text to display when user clicks exit chat button"
                  className="min-h-[250px]"
                />
                <p className="text-sm text-muted-foreground">
                  This text will be displayed in the confirmation modal when a user clicks the exit chat button
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="base-instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Base Instructions</CardTitle>
              <CardDescription>
                Configure the base conversation style instructions that will be appended to all system prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Conversation Style Instructions</Label>
                <div className="mt-4">
                  <BaseInstructionsTab onInstructionsChange={setBaseInstructions} />
                </div>
                <p className="text-sm text-muted-foreground">
                  These instructions help guide the AI's conversational style and are appended to all system prompts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
