import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MessageSquare, Building2, User } from "lucide-react";
import { format } from "date-fns";

// V2 ONLY: Connection data from dashboard
interface ConnectionData {
  id: number;
  businessName?: string;
  contractorName?: string;
  email?: string;
  role?: string;
}

export function ConnectionRequestsList() {
  const { user } = useAuth();

  // Determine if user is a contractor
  const isContractor = user?.role === "contractor";

  // V2: Fetch connections from dashboard data only
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: !!user
  });

  // Extract connections from V2 dashboard data
  const connections = isContractor 
    ? (dashboardData as any)?.businesses || []
    : (dashboardData as any)?.contractors || [];

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Connected";
    }
  };

  // Handle empty state
  if (!isLoading && connections.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{isContractor ? "Company Connections" : "Contractor Connections"}</CardTitle>
          <CardDescription>
            {isContractor 
              ? "Companies you are connected with" 
              : "Contractors you are connected with"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p>{isContractor ? "No company connections yet" : "No contractor connections yet"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // When connections exist
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isContractor ? "Company Connections" : "Contractor Connections"}</CardTitle>
        <CardDescription>
          {isContractor 
            ? "Companies you are connected with" 
            : "Contractors you are connected with"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connections.map((connection: ConnectionData) => (
            <Card key={connection.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2">
                      {isContractor ? (
                        <>
                          <Building2 className="h-4 w-4 text-green-500" />
                          <CardTitle className="text-base">
                            {connection.businessName || connection.email || "Connected Business"}
                          </CardTitle>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 text-green-500" />
                          <CardTitle className="text-base">
                            {connection.contractorName || connection.email || "Connected Contractor"}
                          </CardTitle>
                        </>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      Connected via V2 system
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}