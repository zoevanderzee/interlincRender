import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, User, Calendar, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const { data: contractors = [], isLoading: isLoadingContractors } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: contractorIds.length > 0
  });

  // Fetch contracts for accepted work requests to get deliverables
  const acceptedWorkRequests = workRequests.filter(wr => wr.status === 'accepted');
  const { data: contracts = [] } = useQuery({
    queryKey: ['/api/contracts'],
    enabled: acceptedWorkRequests.length > 0
  });

  // Fetch milestones for all contracts in this project
  const { data: milestones = [] } = useQuery({
    queryKey: ['/api/milestones?contractId=31'],
    queryFn: async () => {
      const response = await fetch('/api/milestones?contractId=31', {
        headers: {
          'X-User-ID': localStorage.getItem('user_id') || '',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch milestones');
      return response.json();
    },
    enabled: contracts.length > 0
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

  const { toast } = useToast();

  const getContractorName = (workRequest: any): string => {
    // Use contractor name from work request data if available
    if (workRequest.contractorName) {
      return workRequest.contractorName;
    }
    
    // Fallback to lookup in contractors array
    if (isLoadingContractors) return 'Loading...';
    const contractor = contractors.find(c => c.id === workRequest.contractorUserId);
    if (!contractor) return 'Contractor not found';
    return contractor.firstName && contractor.lastName 
      ? `${contractor.firstName} ${contractor.lastName}`
      : contractor.username;
  };

  const handleApproveMilestone = async (milestoneId: number) => {
    try {
      await apiRequest('POST', `/api/milestones/${milestoneId}/approve`, {});
      
      toast({
        title: "Milestone Approved",
        description: "Payment will be processed automatically",
      });
      
      // Refresh milestone data
      queryClient.invalidateQueries({ queryKey: ['/api/milestones?contractId=31'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve milestone. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectMilestone = async (milestoneId: number) => {
    try {
      await apiRequest('POST', `/api/milestones/${milestoneId}/reject`, {
        notes: "Please make revisions as discussed"
      });
      
      toast({
        title: "Milestone Rejected",
        description: "Contractor has been notified to make changes",
      });
      
      // Refresh milestone data
      queryClient.invalidateQueries({ queryKey: ['/api/milestones?contractId=31'] });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to reject milestone. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Split work requests into pending and accepted
  const pendingWorkRequests = workRequests.filter(wr => 
    wr.status === 'assigned' || wr.status === 'pending'
  );
  const acceptedWorkRequestsData = workRequests.filter(wr => 
    wr.status === 'accepted'
  );

  // Get contract details for accepted work requests
  const getContractForWorkRequest = (workRequestId: number) => {
    return contracts.find((c: any) => c.workRequestId === workRequestId);
  };

  // Get milestones for a contract
  const getMilestonesForContract = (contractId: number) => {
    return milestones.filter(m => m.contractId === contractId);
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
            <CardTitle className="text-white">Work Requests ({pendingWorkRequests.length})</CardTitle>
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
          ) : pendingWorkRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No pending work requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingWorkRequests.map((workRequest) => (
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
                      <span>{getContractorName(workRequest)}</span>
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

      {/* Contractors (Accepted Work) */}
      {acceptedWorkRequestsData.length > 0 && (
        <Card className="border-gray-800 bg-black">
          <CardHeader>
            <CardTitle className="text-white">Contractors ({acceptedWorkRequestsData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {acceptedWorkRequestsData.map((workRequest) => {
                const contract = getContractForWorkRequest(workRequest.id);
                const contractMilestones = contract ? getMilestonesForContract(contract.id) : [];
                
                return (
                  <div 
                    key={workRequest.id}
                    className="border border-gray-700 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{workRequest.title}</h4>
                        <p className="text-sm text-gray-400 mb-2">{workRequest.description}</p>
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="h-4 w-4" />
                          <span>{getContractorName(workRequest)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getStatusColor(workRequest.status)} text-white mb-2`}>
                          {workRequest.status}
                        </Badge>
                        <p className="text-sm text-gray-400">
                          ${parseFloat(workRequest.amount).toLocaleString()} {workRequest.currency}
                        </p>
                      </div>
                    </div>

                    {/* Deliverables Section */}
                    {contract && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <h5 className="font-medium text-white mb-3">Deliverables</h5>
                        {contractMilestones.length === 0 ? (
                          <p className="text-sm text-gray-400">No deliverables submitted yet</p>
                        ) : (
                          <div className="space-y-3">
                            {contractMilestones.map((milestone) => (
                              <div 
                                key={milestone.id}
                                className="bg-gray-900 rounded-lg p-3 border border-gray-700"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h6 className="text-sm font-medium text-white">{milestone.name}</h6>
                                  <Badge className={`text-xs ${getStatusColor(milestone.status)} text-white`}>
                                    {milestone.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{milestone.description}</p>
                                
                                {/* Progress and submission info */}
                                {milestone.submittedAt && (
                                  <div className="text-xs text-gray-300 mb-2">
                                    Submitted: {new Date(milestone.submittedAt).toLocaleDateString()}
                                  </div>
                                )}
                                
                                {/* Deliverable files */}
                                {milestone.deliverableFiles && milestone.deliverableFiles.length > 0 && (
                                  <div className="space-y-2 mb-3">
                                    <div className="text-xs text-gray-300 font-medium">
                                      📎 {milestone.deliverableFiles.length} file(s) submitted:
                                    </div>
                                    {milestone.deliverableFiles.map((file: any, idx: number) => (
                                      <div key={idx} className="bg-gray-800 rounded p-2 text-xs">
                                        <div className="text-gray-300">{file.name}</div>
                                        <div className="text-gray-400">
                                          {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Approval actions for completed milestones */}
                                {milestone.status === 'completed' && !milestone.approvedAt && (
                                  <div className="flex gap-2 mt-3">
                                    <Button 
                                      size="sm" 
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                      onClick={() => handleApproveMilestone(milestone.id)}
                                    >
                                      ✓ Approve & Release Payment (${milestone.paymentAmount})
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white text-xs"
                                      onClick={() => handleRejectMilestone(milestone.id)}
                                    >
                                      ✗ Request Changes
                                    </Button>
                                  </div>
                                )}
                                
                                {/* Show if already approved */}
                                {milestone.approvedAt && (
                                  <div className="text-xs text-green-400 mt-2">
                                    ✅ Approved on {new Date(milestone.approvedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}