
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

interface ConnectionRequest {
  id: number;
  businessId: number;
  contractorId: number;
  status: string;
  message: string | null;
  createdAt: string;
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

  const handleApprove = (id: number) => {
    updateRequestMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    updateRequestMutation.mutate({ id, status: "rejected" });
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
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <Badge variant="outline">
                    {request.contractor ? "Incoming" : "Outgoing"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {request.contractor?.username || request.business?.username || "Unknown"}
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {request.message || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      request.status === "approved"
                        ? "default"
                        : request.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(request.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {request.status === "pending" && request.contractor && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(request.id)}
                        disabled={updateRequestMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request.id)}
                        disabled={updateRequestMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {request.status === "pending" && !request.contractor && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Awaiting Response
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
