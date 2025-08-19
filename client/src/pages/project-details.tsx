import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, User, Calendar, DollarSign, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { SubmitWorkModal } from "@/components/SubmitWorkModal";
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
  deliverableDescription?: string;
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
  const { toast } = useToast();
  
  // State for SubmitWorkModal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<{
    id: number;
    name: string;
  } | null>(null);
  
  // Handle opening submit work modal
  const handleSubmitWork = (deliverableId: number, deliverableName: string) => {
    setSelectedDeliverable({ id: deliverableId, name: deliverableName });
    setSubmitModalOpen(true);
  };
  
  // Handle closing submit work modal
  const handleCloseSubmitModal = () => {
    setSubmitModalOpen(false);
    setSelectedDeliverable(null);
  };

  // Handle accepting work request (business action)
  const handleAcceptWorkRequest = async (workRequest: WorkRequest) => {
    try {
      const response = await apiRequest("POST", `/api/work-requests/${workRequest.id}/business-accept`, {
        allocatedBudget: parseFloat(workRequest.amount),
        triggerPayment: true
      });

      if (response.ok) {
        toast({
          title: "Work Request Accepted",
          description: `Budget of $${parseFloat(workRequest.amount).toLocaleString()} allocated and Trolley payment triggered.`,
        });
        
        // Refresh work requests
        await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-requests`] });
      } else {
        throw new Error("Failed to accept work request");
      }
    } catch (error) {
      console.error("Error accepting work request:", error);
      toast({
        title: "Error",
        description: "Failed to accept work request. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle rejecting work request (business action)
  const handleRejectWorkRequest = async (workRequestId: number) => {
    try {
      const response = await apiRequest("POST", `/api/work-requests/${workRequestId}/business-reject`, {
        reason: "Not suitable for current project requirements"
      });

      if (response.ok) {
        toast({
          title: "Work Request Rejected",
          description: "Work request has been rejected and contractor notified.",
        });
        
        // Refresh work requests
        await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-requests`] });
      } else {
        throw new Error("Failed to reject work request");
      }
    } catch (error) {
      console.error("Error rejecting work request:", error);
      toast({
        title: "Error",
        description: "Failed to reject work request. Please try again.",
        variant: "destructive",
      });
    }
  };

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
  
  // Split work requests into pending (assigned) and accepted
  const pendingWorkRequests = workRequests.filter(wr => wr.status === 'assigned');
  const acceptedWorkRequestsData = workRequests.filter(wr => wr.status === 'accepted');
  
  console.log("Work requests:", workRequests.map(wr => ({id: wr.id, status: wr.status, title: wr.title})));
  console.log("Pending work requests:", pendingWorkRequests.length);
  console.log("Current user role:", user?.role);
  
  const { data: contractors = [], isLoading: isLoadingContractors } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: contractorIds.length > 0
  });

  // Fetch contracts for accepted work requests to get deliverables
  // (acceptedWorkRequestsData already defined above)
  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts'],
    enabled: acceptedWorkRequestsData.length > 0
  });

  // Fetch milestones for all contracts in this project
  const { data: milestones = [] } = useQuery<any[]>({
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

  // Filter work requests by status (removing duplicate declaration)

  // Get contract details for accepted work requests
  const getContractForWorkRequest = (workRequestId: number) => {
    // Find work request to get contractor ID
    const workRequest = workRequests.find(wr => wr.id === workRequestId);
    if (!workRequest) return null;
    
    // Find contract by contractor ID and project ID
    return contracts.find((c: any) => 
      c.contractorId === workRequest.contractorUserId && 
      c.projectId === parseInt(projectId)
    );
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
                      {workRequest.deliverableDescription && (
                        <p className="text-xs text-gray-300 mt-1">
                          <strong>Deliverable:</strong> {workRequest.deliverableDescription}
                        </p>
                      )}
                    </div>
                    <Badge className={`ml-4 ${getStatusColor(workRequest.status)} text-white`}>
                      {workRequest.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
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

                  {/* Business Accept Button - Only show for business owners on pending requests */}
                  {workRequest.status === 'assigned' && user?.role === 'business' && (
                    <div className="flex gap-3 pt-3 border-t border-gray-700">
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white text-sm"
                        onClick={() => handleAcceptWorkRequest(workRequest)}
                      >
                        ✓ Accept & Allocate Budget (${parseFloat(workRequest.amount).toLocaleString()})
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white text-sm"
                        onClick={() => handleRejectWorkRequest(workRequest.id)}
                      >
                        ✗ Reject Request
                      </Button>
                    </div>
                  )}
                  
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

                    {/* Progress Bar */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-white">Progress</h5>
                        <span className="text-sm text-gray-400">
                          {contract ? Math.round((getMilestonesForContract(contract.id).filter(m => m.status === 'completed' || m.approvedAt).length / Math.max(getMilestonesForContract(contract.id).length, 1)) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${contract ? Math.round((getMilestonesForContract(contract.id).filter(m => m.status === 'completed' || m.approvedAt).length / Math.max(getMilestonesForContract(contract.id).length, 1)) * 100) : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Deliverables Section */}
                    {contract && (
                      <div className="mt-4">
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
                                
                                {/* Submit work button for contractors with assigned deliverables */}
                                {milestone.status === 'assigned' && user?.id === workRequest.contractorUserId && (
                                  <div className="mt-3">
                                    <Button 
                                      size="sm" 
                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                      onClick={() => handleSubmitWork(milestone.id, milestone.name)}
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Submit Work
                                    </Button>
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
      
      {/* Submit Work Modal */}
      {selectedDeliverable && (
        <SubmitWorkModal
          isOpen={submitModalOpen}
          onClose={handleCloseSubmitModal}
          deliverableId={selectedDeliverable.id}
          deliverableName={selectedDeliverable.name}
        />
      )}
    </div>
  );
}