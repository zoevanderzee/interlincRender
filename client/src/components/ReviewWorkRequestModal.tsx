import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, FileText, Link, Download, Loader2, CreditCard } from "lucide-react";
import { StripeElements } from "@/components/payments/StripeElements";

interface ReviewWorkRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRequestId: number;
  workRequestTitle: string;
}

export function ReviewWorkRequestModal({
  isOpen,
  onClose,
  workRequestId,
  workRequestTitle,
}: ReviewWorkRequestModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState("");
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fetch the latest submission
  const { data: submissionData, isLoading } = useQuery({
    queryKey: [`/api/work-requests/${workRequestId}/submissions/latest`],
    enabled: isOpen && !!workRequestId,
  });

  // Fetch work request details to get amount and contractor info
  const { data: workRequestData } = useQuery({
    queryKey: [`/api/work-requests/${workRequestId}`],
    enabled: isOpen && !!workRequestId,
  });

  const submission = submissionData?.submission;
  const workRequest = workRequestData;

  const reviewMutation = useMutation({
    mutationFn: async (data: { action: 'reject'; reviewNotes?: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/work-requests/${workRequestId}/submissions/${submission.id}/review`,
        data
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Review failed' }));
        throw new Error(errorData.message || `Review failed with status ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work Rejected",
        description: "Contractor has been notified of the rejection.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    // Show Stripe payment form instead of immediately processing
    setShowStripeForm(true);
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide feedback when rejecting work.",
        variant: "destructive",
      });
      return;
    }
    reviewMutation.mutate({ action: 'reject', reviewNotes });
  };

  const handlePaymentComplete = async (paymentIntentId: string) => {
    console.log('Payment completed with intent ID:', paymentIntentId);

    // Now mark the submission as approved
    try {
      const response = await apiRequest(
        "POST",
        `/api/work-requests/${workRequestId}/submissions/${submission.id}/approve-after-payment`,
        { paymentIntentId, reviewNotes }
      );

      if (!response.ok) {
        throw new Error('Failed to approve submission after payment');
      }

      setPaymentSuccess(true);
      toast({
        title: 'Payment Successful',
        description: `Work approved and payment sent to contractor`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/work-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        setShowStripeForm(false);
        setPaymentSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error approving after payment:', error);
      toast({
        title: 'Error',
        description: 'Payment successful but failed to update submission status',
        variant: 'destructive',
      });
    }
  };

  // Show payment success screen
  if (paymentSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Payment Successful</h2>
            <p className="text-muted-foreground mb-4">
              Work approved and payment sent to contractor
            </p>
            {workRequest && (
              <div className="space-y-2">
                <p className="text-2xl font-bold">£{workRequest.amount}</p>
                <p className="text-sm text-muted-foreground">
                  {workRequestTitle}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show Stripe payment form
  if (showStripeForm && workRequest) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {
        setShowStripeForm(false);
        onClose();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Payment
            </DialogTitle>
            <DialogDescription>
              Enter your payment details to approve and pay for this work
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="text-2xl font-bold">£{workRequest.amount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Task:</span>
                <span className="text-sm font-medium">{workRequestTitle}</span>
              </div>
            </div>

            <StripeElements
              amount={Math.round(Number(workRequest.amount) * 100)}
              currency={workRequest.currency?.toLowerCase() || 'gbp'}
              description={`Payment for: ${workRequestTitle}`}
              metadata={{
                work_request_id: workRequestId.toString(),
                submission_id: submission.id.toString(),
              }}
              contractorId={workRequest.contractorUserId}
              onPaymentComplete={handlePaymentComplete}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Submission: {workRequestTitle}</DialogTitle>
          <DialogDescription>
            Review the contractor's work and approve or request changes.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loader-submission">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : submission ? (
          <div className="space-y-6">
            {/* Submission Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Submission Details</span>
                  <Badge variant="secondary" data-testid="badge-version">
                    Version {submission.version}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Submission Type */}
                <div>
                  <Label className="text-muted-foreground">Submission Type</Label>
                  <p className="mt-1" data-testid="text-submission-type">
                    {submission.submissionType === 'digital' ? 'Digital Delivery' : 'Physical Delivery'}
                  </p>
                </div>

                {/* Deliverable Description */}
                {submission.deliverableDescription && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1 whitespace-pre-wrap" data-testid="text-deliverable-description">
                      {submission.deliverableDescription}
                    </p>
                  </div>
                )}

                {/* Contractor Notes */}
                {submission.notes && (
                  <div>
                    <Label className="text-muted-foreground">Contractor Notes</Label>
                    <p className="mt-1 whitespace-pre-wrap" data-testid="text-contractor-notes">
                      {submission.notes}
                    </p>
                  </div>
                )}

                {/* External Link */}
                {submission.artifactUrl && (
                  <div>
                    <Label className="text-muted-foreground">External Link</Label>
                    <div className="mt-1">
                      <a
                        href={submission.artifactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                        data-testid="link-artifact"
                      >
                        <Link className="h-4 w-4" />
                        {submission.artifactUrl}
                      </a>
                    </div>
                  </div>
                )}

                {/* Uploaded Files */}
                {submission.deliverableFiles && submission.deliverableFiles.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Uploaded Files</Label>
                    <div className="mt-2 space-y-2">
                      {submission.deliverableFiles.map((file: any, index: number) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium" data-testid={`text-file-name-${index}`}>
                                  {file.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`link-download-file-${index}`}
                            >
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submitted At */}
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="mt-1 text-sm" data-testid="text-submitted-at">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Review Feedback */}
            <div className="space-y-2">
              <Label htmlFor="review-notes">
                Your Feedback {submission.status === 'submitted' && '(Required for rejection)'}
              </Label>
              <Textarea
                id="review-notes"
                placeholder="Provide feedback about the work submission..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                data-testid="input-review-notes"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No submission found
          </div>
        )}

        {submission && submission.status === 'submitted' && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={reviewMutation.isPending}
              data-testid="button-reject"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Request Changes
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!workRequest}
              data-testid="button-approve"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Approve & Pay
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
