import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { MoodBoardUploader } from "@/components/MoodBoardUploader";
import ErrorBoundary from "@/components/error/ErrorBoundary";

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  budget: z.string().min(1, "Budget is required").refine((val) => !isNaN(parseFloat(val)), {
    message: "Budget must be a valid number",
  }),
  contractorUserId: z.number().min(1, "Please select a contractor"),
  moodboard: z.object({
    files: z.array(z.string()),
    links: z.array(z.string())
  }).optional()
});

type TaskFormData = z.infer<typeof taskFormSchema>;

function NewTaskContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch connection requests to get contractors with error handling
  const { data: connectionRequests = [], isLoading: isLoadingConnections, error: connectionError } = useQuery<any[]>({
    queryKey: ['/api/connection-requests'],
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always try to fetch - let the backend handle auth via headers
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: "",
      contractorUserId: 0,
      moodboard: {
        files: [],
        links: []
      }
    },
  });

  // Handle connection error
  const handleConnectionError = useCallback(() => {
    if (connectionError) {
      toast({
        title: "Connection Error",
        description: "Failed to load contractors. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [connectionError, toast]);

  React.useEffect(() => {
    handleConnectionError();
  }, [handleConnectionError]);

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      // Get current user data from API to get businessId
      const userResponse = await apiRequest("GET", "/api/user");
      if (!userResponse.ok) {
        throw new Error("Authentication required - please log in again");
      }

      const currentUser = await userResponse.json();
      const businessId = currentUser.id;

      if (!businessId) {
        throw new Error("User ID not found - authentication required");
      }

      // First create a project for this task with proper businessId
      const projectResponse = await apiRequest("POST", "/api/projects", {
        name: data.name,
        businessId: businessId, // Now properly set!
        description: data.description,
        budget: data.budget,
        status: "active"
      });

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json();
        throw new Error(errorData.message || "Failed to create project");
      }

      const project = await projectResponse.json();

      // Then create a work request for the task
      const workRequestResponse = await apiRequest("POST", `/api/projects/${project.id}/work-requests`, {
        projectId: project.id,
        contractorUserId: data.contractorUserId,
        title: data.name,
        description: data.description,
        deliverableDescription: data.description,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
        amount: parseFloat(data.budget),
        currency: "USD"
      });

      if (!workRequestResponse.ok) {
        const errorData = await workRequestResponse.json();
        throw new Error(errorData.message || "Failed to create work request");
      }

      return workRequestResponse.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Task Created",
        description: `Successfully created task and assigned contractor. Work request ID: ${result.workRequestId}`
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
      navigate('/projects');
    },
    onError: (error: any) => {
      console.error("Task creation error:", error);
      toast({
        title: "Task Creation Failed",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  // Show loading state
  if (isLoadingConnections) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-800 rounded w-1/3"></div>
          <div className="h-64 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-6">
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
              Create New Task
            </h1>
            <p className="text-red-400 mt-1">
              Failed to load contractors. Please refresh the page and try again.
            </p>
          </div>
        </div>
        <Card className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-lg shadow-sm border border-zinc-800">
          <CardContent className="text-center">
            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safely filter contractors
  const availableContractors = Array.isArray(connectionRequests)
    ? connectionRequests.filter((req: any) => req?.status === 'accepted')
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-6">
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
            Create New Task
          </h1>
          <p className="text-zinc-400 mt-1">
            Create a quick task assignment for an individual contractor
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-lg shadow-sm border border-zinc-800">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-white">Task Details</CardTitle>
          </CardHeader>
          <CardContent className="bg-transparent">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Task Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter task name"
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
                          placeholder="Describe what this task involves"
                          className="bg-zinc-900 border-zinc-700 text-white"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mood Board Section */}
                <FormField
                  control={form.control}
                  name="moodboard"
                  render={({ field }) => (
                    <FormItem>
                      <MoodBoardUploader
                        value={field.value}
                        onChange={field.onChange}
                        disabled={createTaskMutation.isPending}
                      />
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

                <FormField
                  control={form.control}
                  name="contractorUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Assign to Contractor</FormLabel>
                      <ErrorBoundary fallback={<div>Error loading contractor selection</div>}>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value ? field.value.toString() : ""}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                              <SelectValue placeholder="Choose a contractor..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            {availableContractors.length === 0 ? (
                              <div className="p-4 text-center text-gray-400">
                                <p>No contractors available</p>
                                <Button
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => navigate('/contractors')}
                                >
                                  Find Contractors
                                </Button>
                              </div>
                            ) : (
                              availableContractors.map((contractor: any) => (
                                <SelectItem
                                  key={contractor.id}
                                  value={contractor.id.toString()}
                                  className="text-white hover:bg-gray-800"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {contractor.firstName && contractor.lastName
                                        ? `${contractor.firstName} ${contractor.lastName}`
                                        : contractor.username || 'Contractor'
                                      }
                                    </span>
                                    <span className="text-sm text-gray-400">{contractor.email}</span>
                                    <span className="text-xs text-green-400">Payment Ready</span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </ErrorBoundary>
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
                    disabled={createTaskMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createTaskMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Task"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function NewTask() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-6 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <NewTaskContent />
    </React.Suspense>
  );
}