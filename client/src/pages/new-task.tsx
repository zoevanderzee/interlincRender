
import React from "react";
import { useState } from "react";
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

const taskFormSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().min(1, "Task description is required"),
  deliverableDescription: z.string().min(1, "Deliverable description is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(parseFloat(val)), {
    message: "Amount must be a valid number",
  }),
  dueDate: z.string().min(1, "Due date is required"),
  contractorUserId: z.number().min(1, "Please select a contractor"),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

export default function NewTask() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch connection requests to get contractors
  const { data: connectionRequests = [], isLoading: isLoadingConnections } = useQuery<any[]>({
    queryKey: ['/api/connection-requests'],
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      deliverableDescription: "",
      amount: "",
      dueDate: "",
      contractorUserId: 0,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      // First create a project for this task
      const projectResponse = await apiRequest("POST", "/api/projects", {
        name: data.title,
        description: data.description,
        budget: data.amount,
        status: "active"
      });
      const project = await projectResponse.json();

      // Then create a work request for the task
      const workRequestResponse = await apiRequest("POST", `/api/projects/${project.id}/work-requests`, {
        projectId: project.id,
        contractorUserId: data.contractorUserId,
        title: data.title,
        description: data.description,
        deliverableDescription: data.deliverableDescription,
        dueDate: data.dueDate,
        amount: parseFloat(data.amount),
        currency: "USD"
      });

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

  if (isLoadingConnections) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-gray-800 rounded w-1/3"></div>
        <div className="h-64 bg-gray-800 rounded"></div>
      </div>
    );
  }

  const availableContractors = connectionRequests.filter((req: any) => req.status === 'accepted');

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
            Create New Task
          </h1>
          <p className="text-zinc-400 mt-1">
            Create a quick task assignment for an individual contractor
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-black p-6 rounded-lg shadow-sm border border-zinc-800">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-white">Task Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
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
                      <FormLabel className="text-white">Task Description</FormLabel>
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

                <FormField
                  control={form.control}
                  name="deliverableDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Expected Deliverable</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what the contractor should deliver"
                          className="bg-zinc-900 border-zinc-700 text-white"
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Task Value ($)</FormLabel>
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
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            className="bg-zinc-900 border-zinc-700 text-white"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contractorUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Assign to Contractor</FormLabel>
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
                            availableContractors.map((req: any) => (
                              <SelectItem 
                                key={req.contractorUserId || req.id} 
                                value={(req.contractorUserId || req.id).toString()}
                                className="text-white hover:bg-gray-800"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {req.contractorFirstName && req.contractorLastName 
                                      ? `${req.contractorFirstName} ${req.contractorLastName}`
                                      : req.contractorUsername
                                    }
                                  </span>
                                  <span className="text-sm text-gray-400">{req.contractorEmail}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
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
    </>
  );
}
