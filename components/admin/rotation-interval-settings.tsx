"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RotationIntervalSettings() {
  const [interval, setInterval] = useState<number>(360);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // Fetch current interval
    fetch('/api/admin/settings/rotation-interval')
      .then(res => res.json())
      .then(data => setInterval(data.rotationInterval))
      .catch(error => {
        console.error('Error fetching rotation interval:', error);
        toast({
          title: "Error",
          description: "Failed to fetch current rotation interval",
          variant: "destructive",
        });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/settings/rotation-interval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ minutes: interval }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rotation interval');
      }

      toast({
        title: "Success",
        description: "Rotation interval updated successfully",
      });
    } catch (error) {
      console.error('Error updating rotation interval:', error);
      toast({
        title: "Error",
        description: "Failed to update rotation interval",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persona Rotation Settings</CardTitle>
        <CardDescription>
          Configure how often the active persona should automatically change
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="interval">Rotation Interval (minutes)</Label>
            <Input
              id="interval"
              type="number"
              min="1"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              placeholder="Enter minutes"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Interval"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
