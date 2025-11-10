
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ConnectionRequest {
  id: number;
  businessId: number;
  contractorId: number;
  status: string;
  message: string | null;
  createdAt: string;
  direction?: 'sent' | 'received';
  businessName?: string;
  contractorName?: string;
  otherPartyName?: string;
  contractor?: {
    id: number;
    username: string;
    email: string;
  };
  business?: {
    id: number;
    username: string;
    email: string;
  };
}

export function ConnectionRequestsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: requests = [], isLoading } = useQuery<ConnectionRequest[]>({
    queryKey: ["/api/connection-requests"],
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/connection-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      toast({
        title: "Success",
        description: "Connection request updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
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

  // Helper function to compute direction safely with fallback
  const getDirection = (request: ConnectionRequest): 'sent' | 'received' => {
    // Use backend-provided direction if available
    if (request.direction) {
      return request.direction;
    }
    
    // Fallback: compute based on user role and request IDs
    // This handles cases where backend doesn't provide direction (cached data, etc.)
    if (!user) return 'sent'; // Default to sent if no user context
    
    // For business users: received if contractor initiated
    if (user.role === 'business' && user.id === request.businessId) {
      // If we see contractor data populated, it's likely incoming
      return request.contractor ? 'received' : 'sent';
    }
    
    // For contractor users: received if business initiated  
    if ((user.role === 'contractor' || user.role === 'freelancer') && user.id === request.contractorId) {
      // If we see business data populated, it's likely incoming
      return request.business ? 'received' : 'sent';
    }
    
    return 'sent'; // Safe default
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading connection requests...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>DIRECTION</TableHead>
            <TableHead>CONTRACTOR</TableHead>
            <TableHead>MESSAGE</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>DATE</TableHead>
            <TableHead className="text-right">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No connection requests yet
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => {
              const direction = getDirection(request);
              return (
                <TableRow key={request.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {direction === 'received' ? "Received" : "Sent"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.otherPartyName || request.contractor?.username || request.business?.username || "Unknown"}
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {request.message || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === "accepted"
                          ? "default"
                          : request.status === "declined"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === "pending" && direction === "received" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAccept(request.id)}
                          disabled={updateRequestMutation.isPending}
                          data-testid={`button-accept-${request.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecline(request.id)}
                          disabled={updateRequestMutation.isPending}
                          data-testid={`button-decline-${request.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                    {request.status === "pending" && direction === "sent" && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting Response
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
