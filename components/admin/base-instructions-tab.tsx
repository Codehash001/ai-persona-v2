"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface BaseInstructionsTabProps {
  onInstructionsChange?: (instructions: string) => void;
}

export function BaseInstructionsTab({ onInstructionsChange }: BaseInstructionsTabProps) {
  const [instructions, setInstructions] = useState("")
  const [isLoading, setIsLoading] = useState(true)
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

  const handleInstructionsChange = (value: string) => {
    setInstructions(value);
    if (onInstructionsChange) {
      onInstructionsChange(value);
    }
  };

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Textarea
          value={instructions}
          onChange={(e) => handleInstructionsChange(e.target.value)}
          className="min-h-[250px] font-mono text-sm"
          placeholder="Enter base instructions here..."
        />
      )}
    </div>
  )
}
