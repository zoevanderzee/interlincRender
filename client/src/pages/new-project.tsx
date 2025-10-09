
import React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  budget: z.string().min(1, "Budget is required").refine((val) => !isNaN(parseFloat(val)), {
    message: "Budget must be a valid number",
  }),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function NewProject() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await apiRequest("POST", "/api/projects", {
        name: data.name,
        description: data.description,
        budget: data.budget,
        businessId: parseInt(userId),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });

      toast({
        title: "Project Created",
        description: "Your new project has been created successfully.",
      });

      navigate('/projects');
    },
    onError: (error: any) => {
      console.error('Project creation error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-4 text-white hover:bg-zinc-800"
          onClick={() => navigate('/projects')}
        >
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            Create New Project
          </h1>
          <p className="text-zinc-400 mt-1">
            Create a project that can be assigned to contractors
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-black p-6 rounded-lg shadow-sm border border-zinc-800">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-white">Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Project Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter project name"
                          className="bg-zinc-900 border-zinc-700 text-white"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this project involves"
                          className="bg-zinc-900 border-zinc-700 text-white"
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Budget ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0.00"
                          className="bg-zinc-900 border-zinc-700 text-white"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-4 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/projects')}
                    className="border-zinc-700 text-white hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createProjectMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createProjectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
