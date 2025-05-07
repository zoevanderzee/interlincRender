import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Building, 
  RefreshCw 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ConnectionRequestsList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isContractor = user?.role === "contractor" || user?.role === "freelancer";
  
  // Query to fetch connection requests
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/connection-requests'],
    retry: false,
  });
  
  // Mutation to respond to a connection request
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'accepted' | 'declined' }) => {
      const res = await apiRequest('PATCH', `/api/connection-requests/${id}`, { status });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update connection request");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      toast({
        title: "Request updated",
        description: "The connection request has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update request",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle accepting a request
  const handleAccept = (requestId: number) => {
    respondToRequestMutation.mutate({ id: requestId, status: 'accepted' });
  };
  
  // Handle declining a request
  const handleDecline = (requestId: number) => {
    respondToRequestMutation.mutate({ id: requestId, status: 'declined' });
  };
  
  // Format the request status for display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs font-medium">Pending</span>;
      case 'accepted':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">Accepted</span>;
      case 'declined':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md text-xs font-medium">Declined</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-medium">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Requests</CardTitle>
          <CardDescription>
            {isContractor 
              ? "Businesses that want to connect with you" 
              : "Your connection requests to contractors"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Requests</CardTitle>
          <CardDescription>
            {isContractor 
              ? "Businesses that want to connect with you" 
              : "Your connection requests to contractors"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">Failed to load connection requests</p>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Requests</CardTitle>
        <CardDescription>
          {isContractor 
            ? "Businesses that want to connect with you" 
            : "Your connection requests to contractors"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{isContractor 
              ? "You don't have any connection requests from businesses yet." 
              : "You haven't sent any connection requests to contractors yet."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((request: any) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {isContractor ? "Business Request" : `Request to ${request.profileCode}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div>{getStatusBadge(request.status)}</div>
                </div>
                
                {request.message && (
                  <div className="bg-secondary/30 p-3 rounded-md my-3">
                    <p className="text-sm">{request.message}</p>
                  </div>
                )}
                
                {isContractor && request.status === 'pending' && (
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDecline(request.id)}
                      disabled={respondToRequestMutation.isPending}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Decline
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
                      onClick={() => handleAccept(request.id)}
                      disabled={respondToRequestMutation.isPending}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Accept
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}