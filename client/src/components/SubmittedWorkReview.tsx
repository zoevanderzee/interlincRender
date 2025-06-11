import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, AlertCircle, FileText, Calendar, User, Download } from 'lucide-react';
import { format } from 'date-fns';

interface WorkSubmission {
  id: number;
  workRequestId: number;
  contractorId: number;
  businessId: number;
  title: string;
  description: string;
  notes: string;
  attachmentUrls: string[];
  submissionType: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

interface SubmittedWorkReviewProps {
  businessId: number;
}

export function SubmittedWorkReview({ businessId }: SubmittedWorkReviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<WorkSubmission | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');

  const { data: submissions = [], isLoading } = useQuery<WorkSubmission[]>({
    queryKey: ['/api/work-request-submissions/business', businessId],
    enabled: !!businessId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ submissionId, status, feedback }: { submissionId: number; status: string; feedback: string }) => {
      return await apiRequest('PATCH', `/api/work-request-submissions/${submissionId}/review`, {
        status,
        feedback,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Review submitted',
        description: 'Work submission has been reviewed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/work-request-submissions/business'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setSelectedSubmission(null);
      setReviewFeedback('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error reviewing submission',
        description: error.message || 'Failed to review submission',
        variant: 'destructive',
      });
    },
  });

  const handleReview = (status: string) => {
    if (!selectedSubmission) return;
    
    reviewMutation.mutate({
      submissionId: selectedSubmission.id,
      status,
      feedback: reviewFeedback,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      case 'needs_revision':
        return 'bg-yellow-600';
      case 'pending':
        return 'bg-blue-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'needs_revision':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Submitted Work</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Loading submitted work...</p>
        </CardContent>
      </Card>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Submitted Work</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">No work submissions to review</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Submitted Work for Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissions.map((submission: WorkSubmission) => (
              <Card key={submission.id} className="bg-zinc-800 border-zinc-700">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-white font-medium">{submission.title}</h3>
                        <Badge className={`${getStatusBadgeColor(submission.status)} text-white`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(submission.status)}
                            <span className="capitalize">{submission.status.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-400 mb-3">{submission.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Contractor ID: {submission.contractorId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Submitted: {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Type: {submission.submissionType === 'digital' ? 'Digital' : 'Physical Task'}</span>
                        </div>
                      </div>

                      {submission.attachmentUrls && submission.attachmentUrls.length > 0 && (
                        <div className="mb-4">
                          <Label className="text-white text-sm mb-2 block">Attachments:</Label>
                          <div className="flex flex-wrap gap-2">
                            {submission.attachmentUrls.map((url: string, index: number) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="border-gray-700 text-gray-300 hover:bg-gray-700"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                {url.split('/').pop()}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {submission.notes && (
                        <div className="mb-4">
                          <Label className="text-white text-sm mb-2 block">Additional Notes:</Label>
                          <p className="text-gray-400 text-sm">{submission.notes}</p>
                        </div>
                      )}

                      {submission.reviewNotes && (
                        <div className="mb-4">
                          <Label className="text-white text-sm mb-2 block">Review Feedback:</Label>
                          <p className="text-gray-400 text-sm">{submission.reviewNotes}</p>
                        </div>
                      )}
                    </div>

                    {submission.status === 'pending' && (
                      <div className="ml-4">
                        <Button
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Review
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedSubmission && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Review Submission: {selectedSubmission.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white text-sm mb-2 block">Review Feedback:</Label>
              <Textarea
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Provide feedback on the submitted work..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={4}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => handleReview('approved')}
                disabled={reviewMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              
              <Button
                onClick={() => handleReview('needs_revision')}
                disabled={reviewMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Request Revision
              </Button>
              
              <Button
                onClick={() => handleReview('rejected')}
                disabled={reviewMutation.isPending}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              
              <Button
                onClick={() => {
                  setSelectedSubmission(null);
                  setReviewFeedback('');
                }}
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}