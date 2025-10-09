
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
  description: z.string().min(1, "Description is required"),
  budget: z.string().min(1, "Budget is required").refine((val) => !isNaN(parseFloat(val)), {
    message: "Budget must be a valid number",
  }),
  deadline: z.string().optional(),
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
      deadline: "",
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
            Projects can have multiple contractors assigned with individual tasks and budgets
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-400 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-300 mb-1">Multi-Contractor Project</h3>
            <p className="text-sm text-blue-200/80">
              This is for larger projects with multiple contractors. After creating the project, you can assign contractors with their own deliverables and payment amounts.
            </p>
            <p className="text-sm text-blue-200/80 mt-2">
              <strong>For quick single-contractor tasks</strong>, use the "Tasks" tab instead.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-black p-6 rounded-lg shadow-sm border border-zinc-800">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-white">Project Information</CardTitle>
            <p className="text-sm text-gray-400 mt-2">Set the overall project details and total budget</p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Project Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Website Redesign Project"
                          className="bg-zinc-900 border-zinc-700 text-white"
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-gray-400 mt-1">A clear name that describes the overall project</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Project Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the project scope, goals, and what contractors will be working on..."
                          className="bg-zinc-900 border-zinc-700 text-white"
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-gray-400 mt-1">Provide context that will be shared with all assigned contractors</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Total Project Budget (£) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="bg-zinc-900 border-zinc-700 text-white"
                            {...field} 
                          />
                        </FormControl>
                        <p className="text-xs text-gray-400 mt-1">Overall budget for all contractors</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Project Deadline</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            className="bg-zinc-900 border-zinc-700 text-white"
                            {...field} 
                          />
                        </FormControl>
                        <p className="text-xs text-gray-400 mt-1">Optional: Overall project completion date</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
