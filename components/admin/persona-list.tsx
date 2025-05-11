"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { UpdatePersonaDialog } from "./update-persona-dialog"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface Persona {
  id: string
  name: string
  systemPrompt: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export function PersonaList() {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const { toast } = useToast()

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      const response = await fetch("/api/personas")
      if (!response.ok) throw new Error("Failed to fetch personas")
      return response.json()
    }
  })

  const togglePersonaStatus = async (id: string, currentStatus: boolean) => {
    try {
      // If trying to deactivate the only active persona, prevent it
      if (currentStatus && personas.filter((p: Persona) => p.isActive).length === 1) {
        toast({
          variant: "destructive",
          title: "Cannot deactivate",
          description: "At least one persona must be active"
        })
        return
      }

      const response = await fetch(`/api/personas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update persona status")
      }

      toast({
        title: "Status updated",
        description: "Persona status has been updated successfully."
      })

      // Refresh the personas list
      // fetchPersonas()
    } catch (error) {
      console.error("Error toggling persona status:", error)
      toast({
        variant: "destructive",
        title: "Error updating status",
        description: "There was a problem updating the persona status. Please try again."
      })
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>System Prompt</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                <TableCell><Skeleton className="h-8 w-[70px]" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>System Prompt</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No personas found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              personas.map((persona: Persona) => (
                <TableRow key={persona.id}>
                  <TableCell className="font-medium">{persona.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {persona.systemPrompt}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(persona.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={persona.isActive}
                      onCheckedChange={() => togglePersonaStatus(persona.id, persona.isActive)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPersona(persona)
                        setIsUpdateDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <UpdatePersonaDialog
        open={isUpdateDialogOpen}
        onOpenChange={setIsUpdateDialogOpen}
        persona={selectedPersona}
      />
    </>
  )
}
