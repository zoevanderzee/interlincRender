import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, DollarSign, ArrowLeft, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const workRequestSchema = z.object({
  projectId: z.number(),
  contractorUserId: z.number(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  deliverableDescription: z.string().min(1, "Deliverable description is required"),
  dueDate: z.string().min(1, "Due date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().default("USD")
});

type WorkRequestForm = z.infer<typeof workRequestSchema>;

export default function AssignContractor() {
  const params = useParams();
  const contractorId = params.contractorId || null;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get projectId and contractorId from query params if available
  const urlParams = new URLSearchParams(window.location.search);
  const projectIdFromQuery = urlParams.get('projectId');
  const contractorIdFromQuery = urlParams.get('contractorId');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdFromQuery || "");

  // Fetch contractor details (only if contractorId is provided via URL or query param)
  const contractorIdToFetch = contractorId || contractorIdFromQuery;
  console.log("Contractor ID to fetch:", contractorIdToFetch);
  
  const { data: contractor, isLoading: isLoadingContractor } = useQuery<any>({
    queryKey: [`/api/users/${contractorIdToFetch}`],
    enabled: !!contractorIdToFetch
  });
  
  console.log("Contractor data:", contractor);
  console.log("Is loading contractor:", isLoadingContractor);

  // Fetch connection requests to get contractors
  const { data: connectionRequests = [], isLoading: isLoadingConnections } = useQuery<any[]>({
    queryKey: ['/api/connection-requests'],
    enabled: !!user
  });

  // Fetch user's projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    enabled: !!user
  });

  const [selectedContractorId, setSelectedContractorId] = useState<string>(contractorIdFromQuery || "");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<WorkRequestForm>({
    resolver: zodResolver(workRequestSchema),
    defaultValues: {
      contractorUserId: parseInt(contractorId || contractorIdFromQuery || selectedContractorId || "0"),
      currency: "USD"
    }
  });

  const createWorkRequestMutation = useMutation({
    mutationFn: async (data: WorkRequestForm) => {
      const response = await apiRequest("POST", `/api/projects/${data.projectId}/work-requests`, data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Work Request Created",
        description: `Successfully assigned contractor to project. Work request ID: ${result.workRequestId}`
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
      navigate('/projects');
    },
    onError: (error: any) => {
      console.error("Work request creation error:", error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign contractor to project",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: WorkRequestForm) => {
    const contractorToUse = parseInt(contractorId || contractorIdFromQuery || selectedContractorId || "0");
    const projectToUse = parseInt(selectedProjectId || "0");

    if (!projectToUse) {
      toast({
        title: "Project Required",
        description: "Please select a project for this assignment",
        variant: "destructive"
      });
      return;
    }

    if (!contractorToUse) {
      toast({
        title: "Contractor Required",
        description: "Please select a contractor for this assignment",
        variant: "destructive"
      });
      return;
    }

    const formData = {
      ...data,
      projectId: projectToUse,
      contractorUserId: contractorToUse
    };

    createWorkRequestMutation.mutate(formData);
  };

  if (isLoadingConnections || isLoadingProjects) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-gray-800 rounded w-1/3"></div>
        <div className="h-64 bg-gray-800 rounded"></div>
      </div>
    );
  }

  // Show contractor selection if no contractorId in URL params or query params
  const showContractorSelection = !contractorId && !contractorIdFromQuery;
  const availableContractors = connectionRequests.filter((req: any) => req.status === 'accepted');

  const selectedProject = projects.find(p => p.id.toString() === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(projectIdFromQuery ? '/projects' : '/contractors')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {projectIdFromQuery ? 'Projects' : 'Contractors'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Assign Contractor to Project</h1>
            <p className="text-gray-400 mt-1">Create a work request for a specific project</p>
          </div>
        </div>
      </div>

      {/* Contractor Selection/Details */}
      {showContractorSelection ? (
        <Card className="border-gray-800 bg-black">
          <CardHeader>
            <CardTitle className="text-white">Select Contractor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label className="text-white">Choose Contractor *</Label>
              <Select 
                value={selectedContractorId} 
                onValueChange={(value) => {
                  setSelectedContractorId(value);
                  setValue('contractorUserId', parseInt(value));
                }}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Choose a contractor..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
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
            </div>
          </CardContent>
        </Card>
      ) : (
        (isLoadingContractor ? (
          <Card className="border-gray-800 bg-black">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse"></div>
                <div>
                  <div className="h-6 bg-gray-700 rounded animate-pulse mb-2 w-32"></div>
                  <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : contractor && (
          <Card className="border-gray-800 bg-black">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {contractor.firstName && contractor.lastName 
                      ? `${contractor.firstName} ${contractor.lastName}`
                      : contractor.username
                    }
                  </h3>
                  <p className="text-gray-400">{contractor.email}</p>
                  <Badge variant="secondary" className="mt-1">
                    {contractor.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Assignment Form */}
      <Card className="border-gray-800 bg-black">
        <CardHeader>
          <CardTitle className="text-white">Project Assignment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label className="text-white">Select Project *</Label>
              <Select 
                value={selectedProjectId} 
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  setValue('projectId', parseInt(value));
                }}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {projects.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      <p>No projects available</p>
                      <Button 
                        size="sm" 
                        className="mt-2" 
                        onClick={() => navigate('/projects/new')}
                      >
                        Create Project
                      </Button>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <SelectItem 
                        key={project.id} 
                        value={project.id.toString()}
                        className="text-white hover:bg-gray-800"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-sm text-gray-400">
                            Budget: ${parseFloat(project.budget || 0).toLocaleString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!selectedProjectId && (
                <p className="text-sm text-gray-400">
                  Select the project this contractor will work on
                </p>
              )}
            </div>

            {/* Selected Project Details */}
            {selectedProject && (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-4">
                  <h4 className="font-medium text-white mb-2">Project Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-yellow-400 mr-2" />
                      <span className="text-gray-400">Budget:</span>
                      <span className="text-white ml-2">
                        ${parseFloat(selectedProject.budget || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-blue-400 mr-2" />
                      <span className="text-gray-400">Status:</span>
                      <span className="text-white ml-2 capitalize">{selectedProject.status}</span>
                    </div>
                  </div>
                  {selectedProject.description && (
                    <p className="text-gray-300 mt-3 text-sm">{selectedProject.description}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Work Request Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Work Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="e.g., UI Design for Homepage"
                />
                {errors.title && (
                  <p className="text-red-400 text-sm">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-white">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-red-400 text-sm">{errors.amount.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Work Description *</Label>
              <Textarea
                id="description"
                {...register('description')}
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
                placeholder="Describe the specific work to be performed..."
              />
              {errors.description && (
                <p className="text-red-400 text-sm">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverableDescription" className="text-white">Expected Deliverable *</Label>
              <Textarea
                id="deliverableDescription"
                {...register('deliverableDescription')}
                className="bg-gray-900 border-gray-700 text-white min-h-[80px]"
                placeholder="Describe what the contractor should deliver (e.g., PSD files, code repository, design mockups)..."
              />
              {errors.deliverableDescription && (
                <p className="text-red-400 text-sm">{errors.deliverableDescription.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-white">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                className="bg-gray-900 border-gray-700 text-white"
              />
              {errors.dueDate && (
                <p className="text-red-400 text-sm">{errors.dueDate.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/contractors')}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createWorkRequestMutation.isPending || !selectedProjectId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createWorkRequestMutation.isPending ? (
                  <>Creating Assignment...</>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign to Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}