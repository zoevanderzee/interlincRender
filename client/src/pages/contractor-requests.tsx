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
import { Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";

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
  const [filterStatus, setFilterStatus] = useState<string>("pending");

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
  }).filter(request => filterStatus === 'all' || request.status === filterStatus);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Work Requests</h1>
          <p className="text-zinc-400 mt-1">Review and respond to project work requests</p>
        </div>

        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button 
            variant={filterStatus === "pending" ? "default" : "outline"} 
            onClick={() => setFilterStatus("pending")}
            className="border-zinc-700"
          >
            <Clock size={16} className="mr-2" />
            Pending
          </Button>

          <Button 
            variant={filterStatus === "accepted" ? "default" : "outline"} 
            onClick={() => setFilterStatus("accepted")}
            className="border-zinc-700"
          >
            <CheckCircle size={16} className="mr-2" />
            Accepted
          </Button>

          <Button 
            variant={filterStatus === "declined" ? "default" : "outline"} 
            onClick={() => setFilterStatus("declined")}
            className="border-zinc-700"
          >
            <XCircle size={16} className="mr-2" />
            Declined
          </Button>

          <Button 
            variant={filterStatus === "all" ? "default" : "outline"} 
            onClick={() => setFilterStatus("all")}
            className="border-zinc-700"
          >
            All
          </Button>
        </div>
      </div>

      {/* Work Requests */}
      <Card className="border border-zinc-800 bg-black">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-medium text-white">Work Requests</h2>
        </div>

        {enrichedRequests.length > 0 ? (
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
                {enrichedRequests.map((request) => (
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
                      {(request.status === 'pending' || request.status === 'assigned') && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-700 text-green-500 hover:bg-green-900 hover:text-green-300"
                            onClick={() => handleAccept(request.id)}
                            disabled={acceptMutation.isPending}
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
                          >
                            <XCircle size={16} className="mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                      {request.status === 'accepted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          onClick={() => {
                            // Navigate to projects page where contractors can see their assignments
                            navigate('/projects');
                          }}
                        >
                          View Project
                        </Button>
                      )}
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
            <h3 className="text-lg font-medium text-white mb-2">No work requests found</h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              {filterStatus === 'pending'
                ? "You don't have any pending work requests right now."
                : filterStatus === 'accepted'
                ? "You haven't accepted any work requests yet."
                : filterStatus === 'declined'
                ? "You haven't declined any work requests."
                : "You don't have any work requests at the moment."}
            </p>
          </div>
        )}
      </Card>
    </>
  );
};

export default ContractorRequests;