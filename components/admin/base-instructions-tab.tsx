"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function BaseInstructionsTab() {
  const [instructions, setInstructions] = useState("")
  const [originalInstructions, setOriginalInstructions] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchBaseInstructions() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/admin/base-instructions")
        
        if (!response.ok) {
          throw new Error("Failed to fetch base instructions")
        }
        
        const data = await response.json()
        setInstructions(data.value)
        setOriginalInstructions(data.value)
      } catch (error) {
        console.error("Error fetching base instructions:", error)
        toast({
          title: "Error",
          description: "Failed to load base instructions",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBaseInstructions()
  }, [toast])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch("/api/admin/base-instructions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: instructions }),
      })

      if (!response.ok) {
        throw new Error("Failed to update base instructions")
      }

      setOriginalInstructions(instructions)
      
      toast({
        title: "Success",
        description: "Base instructions updated successfully",
      })
    } catch (error) {
      console.error("Error updating base instructions:", error)
      toast({
        title: "Error",
        description: "Failed to update base instructions",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = instructions !== originalInstructions

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base Instructions</CardTitle>
        <CardDescription>
          Configure the base conversation style instructions that will be appended to all system prompts.
          These instructions help guide the AI's conversational style.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Enter base instructions here..."
            />
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
