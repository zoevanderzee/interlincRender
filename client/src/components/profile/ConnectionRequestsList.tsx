
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ConnectionRequest {
  id: number;
  businessId: number;
  contractorId: number;
  profileCode: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  businessName?: string;
  contractorName?: string;
  createdAt: string;
}

export function ConnectionRequestsList() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Determine if user is a contractor
  const isContractor = user?.role === "contractor";

  // Fetch connection requests from the proper API endpoint
  const { data: connectionRequests = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/connection-requests"],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const response = await fetch("/api/connection-requests", {
          headers: {
            "X-User-ID": user.id.toString()
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch connection requests");
        }
        
        const data = await response.json();
        
        // Enrich requests with business/contractor names
        const requests = await Promise.all(data.map(async (request: ConnectionRequest) => {
          if (isContractor && request.businessId) {
            try {
              const businessRes = await fetch(`/api/users/${request.businessId}`, {
                headers: {
                  "X-User-ID": user.id.toString()
                }
              });
              
              if (businessRes.ok) {
                const business = await businessRes.json();
                // Prioritize company name over username or personal name
                const displayName = business.companyName ? business.companyName : 
                  (business.username === "Creativlinc" ? "Creativ Linc" : 
                    (business.username || 
                    (business.firstName && business.lastName ? 
                      `${business.firstName} ${business.lastName}` : 
                      "Unknown Business")));
                
                return {
                  ...request,
                  businessName: displayName
                };
              }
            } catch (error) {
              console.error("Error fetching business details:", error);
            }
          } else if (!isContractor && request.contractorId) {
            try {
              const contractorRes = await fetch(`/api/users/${request.contractorId}`, {
                headers: {
                  "X-User-ID": user.id.toString()
                }
              });
              
              if (contractorRes.ok) {
                const contractor = await contractorRes.json();
                const displayName = contractor.firstName && contractor.lastName ? 
                  `${contractor.firstName} ${contractor.lastName}` : 
                  contractor.username || "Unknown Contractor";
                
                return {
                  ...request,
                  contractorName: displayName
                };
              }
            } catch (error) {
              console.error("Error fetching contractor details:", error);
            }
          }
          return request;
        }));
        
        return requests;
      } catch (error) {
        console.error("Error fetching connection requests:", error);
        return [];
      }
    },
    enabled: !!user
  });

  // Update request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      const response = await fetch(`/api/connection-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id.toString()
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update connection request");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate both connection requests and users to refresh the categorization
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      refetch();
      toast({
        title: "Connection request updated",
        description: "The connection request has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAccept = (id: number) => {
    updateRequestMutation.mutate({ id, status: "accepted" });
  };

  const handleDecline = (id: number) => {
    updateRequestMutation.mutate({ id, status: "declined" });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Recent";
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'declined':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'declined':
        return <XCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading connection requests...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle empty state
  if (connectionRequests.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {isContractor ? "Company Connection Requests" : "Contractor Connection Requests"}
          </CardTitle>
          <CardDescription>
            {isContractor 
              ? "Companies that want to connect with you will appear here" 
              : "Contractors you've sent connection requests to will appear here"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p>{isContractor ? "No connection requests received yet" : "No connection requests sent yet"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show connection requests
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {isContractor ? "Company Connection Requests" : "Contractor Connection Requests"}
        </CardTitle>
        <CardDescription>
          {isContractor 
            ? "Manage connection requests from companies" 
            : "Track your connection requests to contractors"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connectionRequests.map((request: ConnectionRequest) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2">
                      {isContractor ? (
                        <>
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <CardTitle className="text-base">
                            {request.businessName || "Company"}
                          </CardTitle>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 text-green-500" />
                          <CardTitle className="text-base">
                            {request.contractorName || "Contractor"}
                          </CardTitle>
                        </>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      Profile Code: {request.profileCode} • {formatDate(request.createdAt)}
                    </CardDescription>
                    {request.message && (
                      <p className="text-sm text-muted-foreground mt-2">
                        "{request.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusVariant(request.status)} className="capitalize">
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{request.status}</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              {/* Show action buttons only for contractors with pending requests */}
              {isContractor && request.status === 'pending' && (
                <CardContent className="pt-0">
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleAccept(request.id)}
                      disabled={updateRequestMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDecline(request.id)}
                      disabled={updateRequestMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
