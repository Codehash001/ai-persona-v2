"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface UpdatePersonaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  persona: {
    id: string
    name: string
    systemPrompt: string
  } | null
}

export function UpdatePersonaDialog({ open, onOpenChange, persona }: UpdatePersonaDialogProps) {
  const [name, setName] = useState(persona?.name || "")
  const [systemPrompt, setSystemPrompt] = useState(persona?.systemPrompt || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Update state when persona changes
  useEffect(() => {
    if (persona) {
      setName(persona.name)
      setSystemPrompt(persona.systemPrompt)
    }
  }, [persona])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!persona) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/personas/${persona.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, systemPrompt }),
      })

      if (response.ok) {
        onOpenChange(false)
        toast({
          title: "Success",
          description: "Persona updated successfully"
        })
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Failed to update",
          description: error.message || "Failed to update persona"
        })
      }
    } catch (error) {
      console.error("Failed to update persona:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update persona. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!persona) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Update Persona</DialogTitle>
          <DialogDescription>
            Update the persona's name and system prompt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Professional Assistant"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter the system prompt that defines this persona's behavior..."
              className="h-48"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Persona"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
