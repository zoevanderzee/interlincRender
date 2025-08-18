import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, AlertCircle, CreditCard, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TrolleyWidget } from "@/components/trolley/TrolleyWidget";

interface Deliverable {
  id: number;
  name: string;
  description: string;
  status: string;
  paymentAmount: string;
  dueDate: string;
  contractId: number;
  autoPayEnabled: boolean;
  deliverableUrl?: string;
  submittedAt?: string;
  approvedAt?: string;
}

interface Contract {
  id: number;
  contractName: string;
  contractCode: string;
  businessId: number;
  contractorId: number;
}

export default function DeliverableApproval() {
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all deliverables that are submitted and pending approval
  const { data: deliverables = [], isLoading } = useQuery({
    queryKey: ['/api/deliverables'],
    queryFn: async () => {
      const response = await fetch('/api/deliverables');
      return response.json();
    }
  });

  // Fetch contract details for each deliverable
  const { data: contracts = [] } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const response = await fetch('/api/contracts');
      return response.json();
    }
  });

  // Approve deliverable mutation with automated payment
  const approveDeliverable = useMutation({
    mutationFn: async ({ deliverableId, notes }: { deliverableId: number; notes: string }) => {
      return apiRequest("POST", `/api/deliverables/${deliverableId}/approve`, {
        approvalNotes: notes
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Deliverable Approved",
        description: data.payment?.id 
          ? `Payment automatically processed (Transfer ID: ${data.payment.transferId})`
          : "Deliverable approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setSelectedDeliverable(null);
      setApprovalNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve deliverable",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'submitted':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Ready for Review</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getContractName = (contractId: number) => {
    const contract = contracts.find((c: Contract) => c.id === contractId);
    return contract ? `${contract.contractName} (${contract.contractCode})` : `Contract ${contractId}`;
  };

  // Filter deliverables that are submitted and ready for approval
  const pendingApprovalDeliverables = deliverables.filter(
    (deliverable: Deliverable) => deliverable.status === 'submitted'
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deliverable Approvals</h1>
          <p className="text-muted-foreground">
            Review submitted deliverables and approve deliverables to trigger automatic payments
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="w-4 h-4" />
          Automated Payment System Active
        </div>
      </div>

      {pendingApprovalDeliverables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground text-center">
              No deliverables are currently waiting for approval.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingApprovalDeliverables.map((deliverable: Deliverable) => (
            <Card key={deliverable.id} className="border-2 border-yellow-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {deliverable.name}
                      {getStatusBadge(deliverable.status)}
                    </CardTitle>
                    <CardDescription>
                      {getContractName(deliverable.contractId)} • Due: {new Date(deliverable.dueDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${parseFloat(deliverable.paymentAmount).toLocaleString()}
                    </div>
                    {deliverable.autoPayEnabled && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Auto-pay enabled
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{deliverable.description}</p>
                </div>

                {deliverable.deliverableUrl && (
                  <div>
                    <h4 className="font-medium mb-2">Submitted Deliverable</h4>
                    <a 
                      href={deliverable.deliverableUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Deliverable →
                    </a>
                  </div>
                )}

                {deliverable.submittedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Submitted on {new Date(deliverable.submittedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setSelectedDeliverable(deliverable)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Process Payment
                  </Button>
                  <Button variant="outline">
                    Request Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {selectedDeliverable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Approve Deliverable</CardTitle>
              <CardDescription>
                This will approve "{selectedDeliverable.name}" and automatically trigger payment of ${parseFloat(selectedDeliverable.paymentAmount).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border">
                <h4 className="font-medium text-blue-900 mb-2">Trolley Payment Processing</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Payment processed through your Trolley sub-account</li>
                  <li>• 0.25% platform coordination fee</li>
                  <li>• Trolley handles compliance and KYC verification</li>
                  <li>• Structured audit log created for tax records</li>
                </ul>
              </div>

              <div>
                <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Add any notes about this approval..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    approveDeliverable.mutate({
                      deliverableId: selectedDeliverable.id,
                      notes: approvalNotes
                    });
                  }}
                  disabled={approveDeliverable.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {approveDeliverable.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve & Pay Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDeliverable(null);
                    setApprovalNotes("");
                  }}
                  disabled={approveDeliverable.isPending}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}