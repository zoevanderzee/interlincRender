import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  FileText,
  ExternalLink,
  AlertCircle,
  CreditCard,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { StripeElements } from "@/components/payments/StripeElements";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default function WorkRequestReview() {
  const params = useParams();
  const workRequestId = parseInt((params as any).workRequestId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [reviewNotes, setReviewNotes] = useState("");
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: workRequest, isLoading: isLoadingWorkRequest } = useQuery({
    queryKey: [`/api/work-requests/${workRequestId}`],
    enabled: !!workRequestId
  });

  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery({
    queryKey: [`/api/work-request-submissions`, workRequestId],
    enabled: !!workRequestId
  });

  const latestSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null;

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!latestSubmission) throw new Error("No submission found");
      
      const response = await apiRequest("PATCH", `/api/work-request-submissions/${latestSubmission.id}/review`, {
        action: "approve",
        reviewNotes
      });
      return response.json();
    },
    onSuccess: () => {
      setShowStripeForm(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve submission",
        variant: "destructive"
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!latestSubmission) throw new Error("No submission found");
      
      const response = await apiRequest("PATCH", `/api/work-request-submissions/${latestSubmission.id}/review`, {
        action: "reject",
        reviewNotes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Submission Rejected",
        description: "The contractor has been notified to revise their work.",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/work-requests/${workRequestId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      navigate('/projects');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject submission",
        variant: "destructive"
      });
    }
  });

  const handlePaymentComplete = async (paymentIntentId: string) => {
    try {
      const response = await apiRequest("POST", `/api/work-requests/${workRequestId}/approve-payment`, {
        paymentIntentId,
        submissionId: latestSubmission.id,
        reviewNotes
      });

      if (response.ok) {
        setShowStripeForm(false);
        setShowSuccess(true);
        
        queryClient.invalidateQueries({ queryKey: [`/api/work-requests/${workRequestId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });

        toast({
          title: "Payment Successful",
          description: "Work approved and payment processed successfully.",
        });

        setTimeout(() => {
          navigate('/projects');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
    }
  };

  if (isLoadingWorkRequest || isLoadingSubmissions) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-800 rounded w-1/3"></div>
        <div className="h-64 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (!workRequest) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Work Request Not Found</h2>
        <p className="text-gray-400 mb-6">The work request you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  if (!latestSubmission) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No Submission Found</h2>
        <p className="text-gray-400 mb-6">This work request hasn't been submitted yet.</p>
        <Button onClick={() => navigate(`/core/assignments/${workRequestId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          View Work Request
        </Button>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Payment Processed Successfully!</h2>
        <p className="text-gray-400 mb-6">The work has been approved and payment is being processed.</p>
        <Button onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  if (showStripeForm) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setShowStripeForm(false)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Complete Payment</h1>
            <p className="text-gray-400 mt-1">Process payment for approved work</p>
          </div>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>Enter your payment information to complete the transaction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-zinc-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Amount:</span>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(parseFloat(workRequest.amount || '0'), workRequest.currency || 'USD')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Task:</span>
                <span className="text-sm font-medium text-white">{workRequest.title}</span>
              </div>
            </div>

            <StripeElements
              amount={Math.round(parseFloat(workRequest.amount || '0') * 100)}
              currency={workRequest.currency?.toLowerCase() || 'gbp'}
              description={`Payment for: ${workRequest.title}`}
              metadata={{
                work_request_id: workRequestId.toString(),
                submission_id: latestSubmission.id.toString(),
              }}
              contractorId={workRequest.contractorUserId}
              onPaymentComplete={handlePaymentComplete}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(`/core/assignments/${workRequestId}`)}
          className="text-gray-400 hover:text-white"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Review Submission</h1>
          <p className="text-gray-400 mt-1">{workRequest.title}</p>
        </div>
      </div>

      {/* Work Request Summary */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Work Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Budget</p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(parseFloat(workRequest.amount || '0'), workRequest.currency || 'USD')}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Submitted</p>
              <p className="text-lg font-semibold text-white">
                {format(new Date(latestSubmission.submittedAt), 'PPp')}
              </p>
            </div>
          </div>
          {workRequest.deliverableDescription && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Deliverable Requirements</p>
              <p className="text-white">{workRequest.deliverableDescription}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Details */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Contractor Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestSubmission.notes && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Submission Notes</p>
              <p className="text-white">{latestSubmission.notes}</p>
            </div>
          )}

          {latestSubmission.artifactUrl && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Deliverable</p>
              <Button
                variant="outline"
                className="border-zinc-700"
                onClick={() => window.open(latestSubmission.artifactUrl, '_blank')}
                data-testid="button-view-deliverable"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Submission
              </Button>
            </div>
          )}

          {latestSubmission.deliverableFiles && latestSubmission.deliverableFiles.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Attached Files</p>
              <div className="space-y-2">
                {latestSubmission.deliverableFiles.map((file: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-zinc-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{file.name || `File ${index + 1}`}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Your Review</CardTitle>
          <CardDescription>Provide feedback on the submitted work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="reviewNotes" className="text-white">Review Notes (Optional)</Label>
            <Textarea
              id="reviewNotes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any comments or feedback..."
              className="mt-2 bg-zinc-800 border-zinc-700 text-white"
              rows={4}
              data-testid="textarea-review-notes"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              variant="outline"
              className="flex-1 border-red-600 text-red-600 hover:bg-red-600/10"
              data-testid="button-reject"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {rejectMutation.isPending ? "Rejecting..." : "Request Changes"}
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
              data-testid="button-approve"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {approveMutation.isPending ? "Approving..." : "Approve & Pay"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
