"use client"

import { useState } from "react"
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

interface CreatePersonaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePersonaDialog({ open, onOpenChange }: CreatePersonaDialogProps) {
  const [name, setName] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, systemPrompt }),
      })

      if (response.ok) {
        onOpenChange(false)
        setName("")
        setSystemPrompt("")
        toast({
          title: "Success",
          description: "New persona created successfully"
        })
        // Optionally trigger a refresh of the persona list
        window.location.reload()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Failed to create",
          description: error.message || "Failed to create persona"
        })
      }
    } catch (error) {
      console.error("Failed to create persona:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create persona. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Persona</DialogTitle>
          <DialogDescription>
            Add a new AI persona with a custom system prompt.
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
              {isSubmitting ? "Creating..." : "Create Persona"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
