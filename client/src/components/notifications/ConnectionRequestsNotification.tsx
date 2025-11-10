import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Bell, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  direction?: string; // 'sent' or 'received'
  createdAt: string;
  updatedAt: string;
}

// Inner component that handles the actual notification logic
// This ensures consistent hook call order across renders
function ContractorNotification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch connection requests - using default query function from queryClient
  const { data: connectionRequests = [], isLoading, refetch } = useQuery<ConnectionRequest[]>({
    queryKey: ["/api/connection-requests"],
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
      return "Invalid date";
    }
  };

  // Filter pending RECEIVED requests only (not sent by current user)
  const pendingRequests = connectionRequests.filter((req: ConnectionRequest) => 
    req.status === "pending" && req.direction === "received"
  );

  // Show dialog if there are pending requests
  useEffect(() => {
    if (pendingRequests.length > 0 && !isLoading) {
      setIsOpen(true);
    }
  }, [pendingRequests.length, isLoading]);

  // View all requests
  const viewAllRequests = () => {
    setIsOpen(false);
    navigate("/connections");
  };

  // Always render the Dialog (even when no pending requests) so useEffect can control visibility
  return (
    <Dialog open={isOpen && pendingRequests.length > 0} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-500" />
            You have {pendingRequests.length} pending connection {pendingRequests.length === 1 ? 'request' : 'requests'}
          </DialogTitle>
          <DialogDescription>
            Review and respond to businesses who want to work with you
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto px-1 space-y-4">
          {pendingRequests.map((request: ConnectionRequest) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {request.businessName || "Unknown Business"}
                      </CardTitle>
                    </div>
                    <DialogDescription>
                      Request sent {formatDate(request.createdAt)}
                    </DialogDescription>
                  </div>
                  <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">
                    Pending
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
            </Card>
          ))}
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button onClick={viewAllRequests}>
            View All Requests
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Wrapper component that handles authentication status
export function ConnectionRequestsNotification() {
  const { user } = useAuth();
  
  // Only render for contractors
  if (!user || user.role !== "contractor") {
    return null;
  }
  
  return <ContractorNotification />;
}