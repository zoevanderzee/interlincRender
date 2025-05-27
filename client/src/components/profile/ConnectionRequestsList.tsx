import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MessageSquare, Building2 } from "lucide-react";
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

  // Fetch connection requests
  const { data: connectionRequests = [], isLoading } = useQuery({
    queryKey: ["/api/connection-requests"],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching connection requests for user:", user.id, user.role);
      
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
        console.log("Connection requests data:", data);
        
        return data;
      } catch (error) {
        console.error("Error fetching connection requests:", error);
        return [];
      }
    },
    enabled: !!user
  });
  
  // Helper function to deduplicate by businessId
  const deduplicateByBusinessId = (requests: ConnectionRequest[]) => {
    const seen = new Set();
    return requests.filter(req => {
      if (seen.has(req.businessId)) {
        return false;
      }
      seen.add(req.businessId);
      return true;
    });
  };
  
  // Deduplicate accepted requests to show each company only once
  const acceptedRequests = deduplicateByBusinessId(
    connectionRequests.filter((req: ConnectionRequest) => req.status === "accepted")
  );
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Handle empty state
  if (!isLoading && acceptedRequests.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Company Requests</CardTitle>
          <CardDescription>Companies you are connected with</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p>No company connections yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // When requests exist
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Company Requests</CardTitle>
        <CardDescription>Companies you are connected with</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {acceptedRequests.map((request: ConnectionRequest) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-green-500" />
                      <CardTitle className="text-base">
                        {request.businessName || "Unknown Business"}
                      </CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      Connected on {formatDate(request.updatedAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              </CardHeader>
              {request.message && (
                <CardContent className="pt-0">
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">{request.message}</p>
                    </div>
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