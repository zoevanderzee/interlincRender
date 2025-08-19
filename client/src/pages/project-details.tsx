import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, User, Calendar, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";

interface Project {
  id: number;
  name: string;
  description: string;
  budget: string;
  status: string;
  createdAt: string;
  businessId: number;
}

interface WorkRequest {
  id: number;
  title: string;
  description: string;
  amount: string;
  currency: string;
  status: string;
  dueDate: string;
  createdAt: string;
  contractorUserId: number;
  projectId: number;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: string;
}

export default function ProjectDetails() {
  const params = useParams();
  const projectId = (params as any).id;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch project details
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId
  });

  // Fetch work requests for this project
  const { data: workRequests = [], isLoading: isLoadingWorkRequests } = useQuery<WorkRequest[]>({
    queryKey: [`/api/projects/${projectId}/work-requests`],
    enabled: !!projectId
  });

  // Fetch contractor details for each work request
  const contractorIds = [...new Set(workRequests.map(wr => wr.contractorUserId))];
  const { data: contractors = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: contractorIds.length > 0
  });

  if (isLoadingProject) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-gray-800 rounded w-1/3"></div>
        <div className="h-64 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-4">Project Not Found</h2>
        <p className="text-gray-400 mb-6">The project you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const getContractorName = (contractorUserId: number): string => {
    const contractor = contractors.find(c => c.id === contractorUserId);
    if (!contractor) return 'Loading...';
    return contractor.firstName && contractor.lastName 
      ? `${contractor.firstName} ${contractor.lastName}`
      : contractor.username;
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'assigned':
      case 'active':
        return 'bg-blue-600';
      case 'in_progress':
        return 'bg-yellow-600';
      case 'completed':
        return 'bg-green-600';
      case 'cancelled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/projects')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            <p className="text-gray-400 mt-1">
              Created {formatDistanceToNow(new Date(project.createdAt))} ago
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate(`/assign-contractor?projectId=${projectId}`)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Assign Contractor
        </Button>
      </div>

      {/* Project Overview */}
      <Card className="border-gray-800 bg-black">
        <CardHeader>
          <CardTitle className="text-white">Project Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Description</p>
              <p className="text-white">{project.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Budget</p>
              <p className="text-white font-semibold">
                ${parseFloat(project.budget || '0').toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Status</p>
              <Badge className={`${getStatusColor(project.status)} text-white`}>
                {project.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Requests */}
      <Card className="border-gray-800 bg-black">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Work Requests ({workRequests.length})</CardTitle>
            <Button 
              variant="outline"
              onClick={() => navigate(`/assign-contractor?projectId=${projectId}`)}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingWorkRequests ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : workRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No work requests yet</p>
              <Button 
                onClick={() => navigate(`/assign-contractor?projectId=${projectId}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Assignment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {workRequests.map((workRequest) => (
                <div 
                  key={workRequest.id}
                  className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{workRequest.title}</h4>
                      <p className="text-sm text-gray-400 line-clamp-2">{workRequest.description}</p>
                    </div>
                    <Badge className={`ml-4 ${getStatusColor(workRequest.status)} text-white`}>
                      {workRequest.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="h-4 w-4" />
                      <span>{getContractorName(workRequest.contractorUserId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <DollarSign className="h-4 w-4" />
                      <span>${parseFloat(workRequest.amount).toLocaleString()} {workRequest.currency}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Due {formatDistanceToNow(new Date(workRequest.dueDate))} from now</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    Created {formatDistanceToNow(new Date(workRequest.createdAt))} ago
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}