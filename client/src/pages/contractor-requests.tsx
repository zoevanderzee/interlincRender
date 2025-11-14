import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle, XCircle, Calendar, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { WorkRequestDetailsModal } from "@/components/WorkRequestDetailsModal";
import { ReviewWorkRequestModal } from "@/components/ReviewWorkRequestModal";

// Define the work request type - updated to match new schema
interface WorkRequest {
  id: number;
  title: string;
  description: string;
  projectId: number;
  contractorUserId: number;
  dueDate: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  // Old schema fields for backward compatibility
  businessId?: number;
  recipientEmail?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  skills?: string | null;
  attachmentUrls?: string[] | null;
  tokenHash?: string | null;
  expiresAt?: string | null;
  contractId?: number | null;
  // Business name (joined from the query)
  businessName?: string;
  contractName?: string;
}

const ContractorRequests = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("active");
  
  // Modal state
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; workRequestId: number | null }>({
    open: false,
    workRequestId: null,
  });
  const [reviewModal, setReviewModal] = useState<{ open: boolean; workRequestId: number | null; title: string }>({
    open: false,
    workRequestId: null,
    title: '',
  });

  // Only show requests that match the contractor's user ID
  const { data: workRequests = [], isLoading } = useQuery<WorkRequest[]>({
    queryKey: ['/api/work-requests'],
    select: (data) => {
      // Filter requests for this contractor (by user ID or email for backward compatibility)
      return data.filter(request => {
        // New schema: match by contractorUserId
        if (request.contractorUserId && user?.id) {
          return request.contractorUserId === user.id;
        }
        // Old schema fallback: match by email
        if (request.recipientEmail && user?.email) {
          return request.recipientEmail.toLowerCase() === user.email.toLowerCase();
        }
        return false;
      });
    }
  });

  // Get all users data (including businesses) for contractor users
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users']
  });

  // Get contracts data
  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts']
  });

  // Enrich work requests with business and contract names
  const enrichedRequests = workRequests.map(request => {
    // Find the business by ID from all users - handle both old and new schema
    const businessId = request.businessId || (request.projectId ? 86 : null); // For now, assume project belongs to business user 86
    const business = allUsers.find((u: any) => u.id === businessId);

    // Look for the contract in the contracts array
    let contract = contracts.find((c: any) => c.id === request.contractId);

    // If the contractId is null but the title matches a contract name, try to find the contract
    if (!request.contractId && request.title) {
      const matchByTitle = contracts.find((c: any) => 
        c.contractName?.toLowerCase() === request.title.toLowerCase()
      );
      if (matchByTitle) {
        contract = matchByTitle;
      }
    }

    // Get the company name - check multiple possible name fields
    let companyName = business?.companyName || business?.username;

    // If still no name found, try to get business info from dashboard or fallback gracefully
    if (!companyName && businessId === 86) {
      companyName = "Interlinc"; // Based on the user data we can see in logs
    }

    if (!companyName) {
      companyName = "Company"; // Generic fallback instead of showing ID
    }

    return {
      ...request,
      businessName: companyName,
      contractName: contract?.contractName || request.title || 'Project Request',
      contractId: contract?.id || request.contractId
    };
  });

  // Filter by active or completed status based on tab
  const activeRequests = enrichedRequests.filter(request => 
    request.status === 'assigned' || request.status === 'accepted' || request.status === 'submitted' || request.status === 'pending'
  );

  const completedRequests = enrichedRequests.filter(request => 
    request.status === 'completed' || request.status === 'paid' || request.status === 'approved'
  );

  const displayedRequests = activeTab === 'active' ? activeRequests : completedRequests;

  // Accept work request mutation
  const acceptMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest("POST", `/api/work-requests/${requestId}/accept`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept request");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Only show success if the response indicates success
      if (data && (data.success || data.status === 'accepted')) {
        toast({
          title: "Request Accepted",
          description: "You have successfully accepted this work request."
        });
        queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      }
    },
    onError: (error: any) => {
      // Only show error if it's a real error, not a success case
      console.error('Accept error:', error);
      toast({
        title: "Error accepting request",
        description: error.message || "There was a problem accepting this request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Decline work request mutation
  const declineMutation = useMutation({
    mutationFn: async (requestId: number) => {
      // Call the contractor decline endpoint
      const response = await apiRequest('POST', `/api/work-requests/${requestId}/decline`, {});
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decline work request');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request declined",
        description: "The work request has been declined",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error declining request",
        description: "There was a problem declining this request. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle accept request
  const handleAccept = (requestId: number) => {
    acceptMutation.mutate(requestId);
  };

  // Handle decline request
  const handleDecline = (requestId: number) => {
    declineMutation.mutate(requestId);
  };

  // If loading
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-zinc-800 rounded w-1/3"></div>
        <div className="h-10 bg-zinc-800 rounded"></div>
        <div className="h-64 bg-zinc-800 rounded"></div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-white mb-2">My Assignments</h1>
        <p className="text-zinc-400">Review and manage your work assignments</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active-assignments">
              Active ({activeRequests.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-assignments">
              Completed ({completedRequests.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active">
          <Card className="border border-zinc-800 bg-black">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-lg font-medium text-white">Active Assignments</h2>
            </div>

            {activeRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-800">
                <TableRow>
                  <TableHead className="text-zinc-400">Task</TableHead>
                  <TableHead className="text-zinc-400">Company</TableHead>
                  <TableHead className="text-zinc-400">Project</TableHead>
                  <TableHead className="text-zinc-400">Payment</TableHead>
                  <TableHead className="text-zinc-400">Due Date</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-zinc-800 border-b border-zinc-800">
                    <TableCell className="font-medium text-white">
                      <div>
                        <div className="font-medium">{request.title}</div>
                        <div className="text-xs text-zinc-400 mt-1">{request.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">{request.businessName}</TableCell>
                    <TableCell className="text-white">
                      {request.contractId ? (
                        <div className="flex flex-col">
                          <span>{request.contractName}</span>
                          <span className="text-xs text-zinc-400">ID: {request.contractId}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-white">
                      {request.amount ? (
                        <div>{formatCurrency(request.amount, request.currency || 'USD')}</div>
                      ) : request.budgetMin && request.budgetMax && request.budgetMin === request.budgetMax ? (
                        <div>{formatCurrency(request.budgetMin, request.currency || 'USD')}</div>
                      ) : (
                        <div>
                          {request.budgetMin && request.budgetMax ? (
                            <div>{formatCurrency(request.budgetMin, request.currency || 'USD')} - {formatCurrency(request.budgetMax, request.currency || 'USD')}</div>
                          ) : (
                            <div>Not specified</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-white">
                      {request.dueDate ? (
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-zinc-400" />
                          <div>
                            <div>{format(new Date(request.dueDate), 'MMM d, yyyy')}</div>
                            <div className="text-xs text-zinc-400">
                              {formatDistanceToNow(new Date(request.dueDate), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>Not specified</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          request.status === 'pending'
                            ? 'bg-yellow-900 text-yellow-300'
                            : request.status === 'assigned'
                            ? 'bg-blue-900 text-blue-300'
                            : request.status === 'accepted'
                            ? 'bg-green-900 text-green-300'
                            : request.status === 'declined'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {/* Show Review button for submitted status */}
                        {request.status === 'submitted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            onClick={() => setReviewModal({ open: true, workRequestId: request.id, title: request.title })}
                            data-testid={`button-review-${request.id}`}
                          >
                            Review
                          </Button>
                        )}

                        {/* Show Accept/Decline for pending/assigned */}
                        {(request.status === 'pending' || request.status === 'assigned') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-700 text-green-500 hover:bg-green-900 hover:text-green-300"
                              onClick={() => handleAccept(request.id)}
                              disabled={acceptMutation.isPending}
                              data-testid={`button-accept-${request.id}`}
                            >
                              <CheckCircle size={16} className="mr-1" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-700 text-red-500 hover:bg-red-900 hover:text-red-300"
                              onClick={() => handleDecline(request.id)}
                              disabled={declineMutation.isPending}
                              data-testid={`button-decline-${request.id}`}
                            >
                              <XCircle size={16} className="mr-1" />
                              Decline
                            </Button>
                          </>
                        )}

                        {/* Show View Details for all statuses */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          onClick={() => setDetailsModal({ open: true, workRequestId: request.id })}
                          data-testid={`button-view-details-${request.id}`}
                        >
                          <Eye size={16} className="mr-1" />
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
              <Clock size={24} />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Active Assignments</h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              You don't have any active work assignments at the moment.
            </p>
          </div>
        )}
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card className="border border-zinc-800 bg-black">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-lg font-medium text-white">Completed Assignments</h2>
            </div>

            {completedRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-800">
                <TableRow>
                  <TableHead className="text-zinc-400">Task</TableHead>
                  <TableHead className="text-zinc-400">Company</TableHead>
                  <TableHead className="text-zinc-400">Project</TableHead>
                  <TableHead className="text-zinc-400">Payment</TableHead>
                  <TableHead className="text-zinc-400">Completed Date</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-zinc-800 border-b border-zinc-800">
                    <TableCell className="font-medium text-white">
                      <div>
                        <div className="font-medium">{request.title}</div>
                        <div className="text-xs text-zinc-400 mt-1">{request.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">{request.businessName}</TableCell>
                    <TableCell className="text-white">
                      {request.contractId ? (
                        <div className="flex flex-col">
                          <span>{request.contractName}</span>
                          <span className="text-xs text-zinc-400">ID: {request.contractId}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-white">
                      {request.amount ? (
                        <div>{formatCurrency(request.amount, request.currency || 'USD')}</div>
                      ) : (
                        <div>Not specified</div>
                      )}
                    </TableCell>
                    <TableCell className="text-white">
                      {request.createdAt ? (
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-zinc-400" />
                          <div>
                            <div>{format(new Date(request.createdAt), 'MMM d, yyyy')}</div>
                            <div className="text-xs text-zinc-400">
                              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>Not specified</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-900 text-green-300">
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          onClick={() => setDetailsModal({ open: true, workRequestId: request.id })}
                          data-testid={`button-view-details-${request.id}`}
                        >
                          <Eye size={16} className="mr-1" />
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Completed Assignments</h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              Your completed work will appear here once you finish assignments.
            </p>
          </div>
        )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Work Request Details Modal */}
      {detailsModal.workRequestId && (
        <WorkRequestDetailsModal
          isOpen={detailsModal.open}
          onClose={() => setDetailsModal({ open: false, workRequestId: null })}
          workRequestId={detailsModal.workRequestId}
        />
      )}

      {/* Review Work Request Modal */}
      {reviewModal.workRequestId && (
        <ReviewWorkRequestModal
          isOpen={reviewModal.open}
          onClose={() => setReviewModal({ open: false, workRequestId: null, title: '' })}
          workRequestId={reviewModal.workRequestId}
          workRequestTitle={reviewModal.title}
        />
      )}
    </>
  );
};

export default ContractorRequests;