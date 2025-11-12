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
import { CheckCircle2, XCircle, FileText, Link, Download, Loader2 } from "lucide-react";

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

  // Fetch the latest submission
  const { data: submissionData, isLoading } = useQuery({
    queryKey: [`/api/work-requests/${workRequestId}/submissions/latest`],
    enabled: isOpen && !!workRequestId,
  });

  const submission = submissionData?.submission;

  const reviewMutation = useMutation({
    mutationFn: async (data: { action: 'approve' | 'reject'; reviewNotes?: string }) => {
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
    onSuccess: (data, variables) => {
      toast({
        title: variables.action === 'approve' ? "Work Approved" : "Work Rejected",
        description: variables.action === 'approve' 
          ? "Payment has been processed and contractor notified."
          : "Contractor has been notified of the rejection.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
    reviewMutation.mutate({ action: 'approve', reviewNotes });
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
              disabled={reviewMutation.isPending}
              data-testid="button-approve"
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Pay
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
