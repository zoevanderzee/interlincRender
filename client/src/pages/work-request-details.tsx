import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export default function WorkRequestDetails() {
  const params = useParams();
  const workRequestId = parseInt((params as any).workRequestId);
  const [, navigate] = useLocation();

  const { data: workRequest, isLoading } = useQuery({
    queryKey: [`/api/work-requests/${workRequestId}`],
    enabled: !!workRequestId
  });

  const { data: submissions = [] } = useQuery({
    queryKey: [`/api/work-request-submissions`, workRequestId],
    enabled: !!workRequestId
  });

  const { data: project } = useQuery({
    queryKey: ['/api/projects', workRequest?.projectId],
    enabled: !!workRequest?.projectId
  });

  if (isLoading) {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-600">Pending</Badge>;
      case 'accepted':
      case 'assigned':
        return <Badge variant="default" className="bg-blue-600">Active</Badge>;
      case 'submitted':
        return <Badge variant="secondary" className="bg-purple-600">Under Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'completed':
      case 'paid':
        return <Badge variant="default" className="bg-green-700">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="text-gray-400 hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{workRequest.title}</h1>
            <p className="text-gray-400 mt-1">Work Request Details</p>
          </div>
        </div>
        {getStatusBadge(workRequest.status)}
      </div>

      {/* Main Details Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Assignment Information</CardTitle>
          <CardDescription>Details about this work request</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
            <p className="text-white">{workRequest.description || 'No description provided'}</p>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Deliverable */}
          {workRequest.deliverableDescription && (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Deliverable Requirements</h3>
                <p className="text-white">{workRequest.deliverableDescription}</p>
              </div>
              <Separator className="bg-zinc-800" />
            </>
          )}

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Budget</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(parseFloat(workRequest.amount || '0'), workRequest.currency || 'USD')}
                </p>
              </div>
            </div>

            {/* Due Date */}
            {workRequest.dueDate && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Due Date</p>
                  <p className="text-lg font-semibold text-white">
                    {format(new Date(workRequest.dueDate), 'PPP')}
                  </p>
                </div>
              </div>
            )}

            {/* Contractor */}
            {workRequest.contractorUserId && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <User className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Assigned To</p>
                  <p className="text-lg font-semibold text-white">Contractor</p>
                </div>
              </div>
            )}

            {/* Project Link */}
            {project && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-600/20 rounded-lg">
                  <Building2 className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Part of Project</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-lg font-semibold text-blue-400 hover:text-blue-300"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    {project.name}
                    <ExternalLink className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!workRequest.projectId && (
            <>
              <Separator className="bg-zinc-800" />
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <FileText className="h-4 w-4" />
                <span>This is a standalone task (not part of a project)</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Submission History */}
      {submissions && submissions.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Submission History</CardTitle>
            <CardDescription>Work submitted by the contractor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {submissions.map((submission: any, index: number) => (
                <div
                  key={submission.id}
                  className="border border-zinc-800 rounded-lg p-4"
                  data-testid={`submission-${submission.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {submission.status === 'approved' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : submission.status === 'rejected' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                      <span className="font-medium text-white">
                        Submission #{submissions.length - index}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {format(new Date(submission.submittedAt), 'PPp')}
                    </span>
                  </div>

                  {submission.notes && (
                    <p className="text-sm text-gray-300 mb-2">{submission.notes}</p>
                  )}

                  {submission.artifactUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 border-zinc-700"
                      onClick={() => window.open(submission.artifactUrl, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Submission
                    </Button>
                  )}

                  {submission.reviewNotes && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-sm text-gray-400 mb-1">Review Notes:</p>
                      <p className="text-sm text-gray-300">{submission.reviewNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {workRequest.status === 'submitted' && (
        <div className="flex justify-end gap-3">
          <Button
            onClick={() => navigate(`/core/review/${workRequestId}`)}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-review-submission"
          >
            Review Submission
          </Button>
        </div>
      )}
    </div>
  );
}
