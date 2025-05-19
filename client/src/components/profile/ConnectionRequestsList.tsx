import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, MessageSquare, Building2, User } from "lucide-react";
import { format } from "date-fns";

// Connection request type
interface ConnectionRequest {
  id: number;
  profileCode: string | null;
  businessId: number;
  businessName?: string;
  contractorId: number | null;
  contractorName?: string;
  message: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function ConnectionRequestsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  
  // Fetch connection requests
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
        
        // If business user, fetch contractor names for each request
        if (user.role === "business") {
          const requests = await Promise.all(data.map(async (request: ConnectionRequest) => {
            if (request.profileCode) {
              try {
                const contractorRes = await fetch(`/api/contractors/find-by-profile-code/${request.profileCode}`, {
                  headers: {
                    "X-User-ID": user.id.toString()
                  }
                });
                
                if (contractorRes.ok) {
                  const contractor = await contractorRes.json();
                  return {
                    ...request,
                    contractorName: contractor.companyName || 
                      (contractor.firstName && contractor.lastName 
                        ? `${contractor.firstName} ${contractor.lastName}` 
                        : contractor.username)
                  };
                }
              } catch (error) {
                console.error("Error fetching contractor details:", error);
              }
            }
            return request;
          }));
          return requests;
        } 
        // If contractor user, fetch business names for each request
        else if (user.role === "contractor") {
          const requests = await Promise.all(data.map(async (request: ConnectionRequest) => {
            if (request.businessId) {
              try {
                const businessRes = await fetch(`/api/users/${request.businessId}`, {
                  headers: {
                    "X-User-ID": user.id.toString()
                  }
                });
                
                if (businessRes.ok) {
                  const business = await businessRes.json();
                  return {
                    ...request,
                    businessName: business.companyName || 
                      (business.firstName && business.lastName 
                        ? `${business.firstName} ${business.lastName}` 
                        : business.username)
                  };
                }
              } catch (error) {
                console.error("Error fetching business details:", error);
              }
            }
            return request;
          }));
          return requests;
        }
        
        return data;
      } catch (error) {
        console.error("Error fetching connection requests:", error);
        return [];
      }
    },
    enabled: !!user
  });
  
  // Accept or decline connection request
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/connection-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user?.id?.toString() || ""
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
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
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
  
  // Filter requests based on tab
  const pendingRequests = connectionRequests.filter((req: ConnectionRequest) => req.status === "pending");
  const acceptedRequests = connectionRequests.filter((req: ConnectionRequest) => req.status === "accepted");
  const declinedRequests = connectionRequests.filter((req: ConnectionRequest) => req.status === "declined");
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Handle empty state
  if (!isLoading && connectionRequests.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Connection Requests</CardTitle>
          <CardDescription>
            {user?.role === "contractor" 
              ? "Businesses who want to work with you will send connection requests here."
              : "Send connection requests to contractors to add them to your network."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p>No connection requests yet</p>
            {user?.role === "business" && (
              <p className="mt-2">
                Use the "Connect by Profile Code" button to add contractors to your network.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // When requests exist
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Connection Requests</CardTitle>
        <CardDescription>
          {user?.role === "contractor" 
            ? "Manage connection requests from businesses"
            : "Manage your contractor connection requests"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending <Badge variant="outline" className="ml-2">{pendingRequests.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Accepted <Badge variant="outline" className="ml-2">{acceptedRequests.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="declined">
              Declined <Badge variant="outline" className="ml-2">{declinedRequests.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          {/* Pending Requests */}
          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                No pending requests
              </div>
            ) : (
              pendingRequests.map((request: ConnectionRequest) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        {user?.role === "contractor" ? (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {request.businessName || "Unknown Business"}
                            </CardTitle>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {request.contractorName || "Unknown Contractor"}
                            </CardTitle>
                          </div>
                        )}
                        <CardDescription>
                          Request sent {formatDate(request.createdAt)}
                        </CardDescription>
                      </div>
                      <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  {request.message && (
                    <CardContent className="pb-3">
                      <div className="flex space-x-2 text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="italic text-muted-foreground">"{request.message}"</div>
                      </div>
                    </CardContent>
                  )}
                  
                  {user?.role === "contractor" && (
                    <CardFooter className="flex justify-end space-x-2 bg-muted/30 py-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDecline(request.id)}
                        disabled={updateRequestMutation.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleAccept(request.id)}
                        disabled={updateRequestMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
          
          {/* Accepted Requests */}
          <TabsContent value="accepted" className="space-y-4">
            {acceptedRequests.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                No accepted requests
              </div>
            ) : (
              acceptedRequests.map((request: ConnectionRequest) => (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        {user?.role === "contractor" ? (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {request.businessName || "Unknown Business"}
                            </CardTitle>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {request.contractorName || "Unknown Contractor"}
                            </CardTitle>
                          </div>
                        )}
                        <CardDescription>
                          Connected on {formatDate(request.updatedAt)}
                        </CardDescription>
                      </div>
                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
          
          {/* Declined Requests */}
          <TabsContent value="declined" className="space-y-4">
            {declinedRequests.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                No declined requests
              </div>
            ) : (
              declinedRequests.map((request: ConnectionRequest) => (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        {user?.role === "contractor" ? (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {request.businessName || "Unknown Business"}
                            </CardTitle>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {request.contractorName || "Unknown Contractor"}
                            </CardTitle>
                          </div>
                        )}
                        <CardDescription>
                          Declined on {formatDate(request.updatedAt)}
                        </CardDescription>
                      </div>
                      <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
                        <XCircle className="mr-1 h-3 w-3" /> Declined
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}