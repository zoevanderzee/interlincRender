import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  BadgeCheck,
  AlertCircle,
  Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type ConnectionRequest = {
  id: number;
  businessId: number;
  contractorId: number | null;
  profileCode: string | null;
  status: string;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  // Include these fields when joining with users table
  businessName?: string;
};

export function ConnectionRequestsList() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  
  // Query to fetch connection requests
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/connection-requests'],
    retry: false
  });
  
  // Mutation to accept or decline a connection request
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/connection-requests/${id}`, { status });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update connection request");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      toast({
        title: "Connection request updated",
        description: "The connection request has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update connection request",
        variant: "destructive",
      });
    },
  });
  
  // Handle accept/decline actions
  const handleAccept = (id: number) => {
    updateRequestMutation.mutate({ id, status: "accepted" });
  };
  
  const handleDecline = (id: number) => {
    updateRequestMutation.mutate({ id, status: "declined" });
  };
  
  // Filter connection requests by status
  const filterRequests = (status: string) => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter((request: ConnectionRequest) => request.status === status);
  };
  
  // Get requests for each category
  const pendingRequests = filterRequests("pending");
  const acceptedRequests = filterRequests("accepted");
  const declinedRequests = filterRequests("declined");
  
  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><BadgeCheck className="h-3 w-3 mr-1" />Accepted</Badge>;
      case "declined":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Generate business name initials for avatar
  const getInitials = (businessId: number) => {
    const request = data?.find((r: ConnectionRequest) => r.businessId === businessId);
    return request?.businessName 
      ? request.businessName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : "B" + businessId.toString().substring(0, 1);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="mr-2 h-5 w-5" />
          Connection Requests
        </CardTitle>
        <CardDescription>
          Manage connection requests from businesses who want to work with you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-destructive mb-4">Failed to load connection requests</p>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingRequests.length > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No pending connection requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request: ConnectionRequest) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 bg-primary/10">
                              <AvatarFallback className="text-xs font-medium">
                                {getInitials(request.businessId)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">Business #{request.businessId}</p>
                              <p className="text-xs text-muted-foreground">Sent via Profile Code</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          {request.message ? (
                            <p className="max-w-[200px] truncate">{request.message}</p>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">No message</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleAccept(request.id)}
                              disabled={updateRequestMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {updateRequestMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDecline(request.id)}
                              disabled={updateRequestMutation.isPending}
                              className="border-red-200 text-red-700 hover:bg-red-50"
                            >
                              {updateRequestMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-1" />
                              )}
                              Decline
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="accepted">
              {acceptedRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No accepted connection requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acceptedRequests.map((request: ConnectionRequest) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 bg-primary/10">
                              <AvatarFallback className="text-xs font-medium">
                                {getInitials(request.businessId)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">Business #{request.businessId}</p>
                              <p className="text-xs text-muted-foreground">Sent via Profile Code</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          {request.message ? (
                            <p className="max-w-[200px] truncate">{request.message}</p>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">No message</span>
                          )}
                        </TableCell>
                        <TableCell>{renderStatusBadge(request.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="declined">
              {declinedRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No declined connection requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declinedRequests.map((request: ConnectionRequest) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 bg-primary/10">
                              <AvatarFallback className="text-xs font-medium">
                                {getInitials(request.businessId)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">Business #{request.businessId}</p>
                              <p className="text-xs text-muted-foreground">Sent via Profile Code</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          {request.message ? (
                            <p className="max-w-[200px] truncate">{request.message}</p>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">No message</span>
                          )}
                        </TableCell>
                        <TableCell>{renderStatusBadge(request.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}