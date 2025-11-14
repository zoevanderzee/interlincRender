import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, DollarSign, User, FileText, CheckCircle2, Building2, ExternalLink, Download, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SubmissionFile {
  name: string;
  size: number;
  type: string;
  url: string;
}

interface Submission {
  id: number;
  workRequestId: number;
  submittedBy: number;
  notes?: string;
  artifactUrl?: string;
  deliverableFiles?: SubmissionFile[];
  deliverableDescription?: string;
  submissionType: string;
  status: string;
  version: number;
  submittedAt: string;
}

interface WorkRequest {
  id: number;
  title: string;
  description: string;
  deliverableDescription?: string;
  dueDate?: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  contractorUserId?: number;
  businessId?: number;
  projectId?: number;
  isOverdue?: boolean;
  daysOverdue?: number;
  daysRemaining?: number;
  businessName?: string;
  businessEmail?: string;
  contractorName?: string;
  contractorEmail?: string;
  projectName?: string;
  latestSubmission?: Submission | null;
}

interface WorkRequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRequestId: number;
}

export function WorkRequestDetailsModal({
  isOpen,
  onClose,
  workRequestId,
}: WorkRequestDetailsModalProps) {
  // Fetch work request details (now includes business and contractor info from backend)
  const { data: workRequest, isLoading } = useQuery<WorkRequest>({
    queryKey: [`/api/work-requests/${workRequestId}`],
    enabled: isOpen && !!workRequestId,
  });

  // Helper to format status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
      case 'paid':
        return 'default';
      case 'submitted':
        return 'secondary';
      case 'rejected':
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Work Request Details</DialogTitle>
          <DialogDescription>
            View complete information about this work request.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loader-work-request">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : workRequest ? (
          <div className="space-y-6">
            {/* Work Request Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Task Information</span>
                  <Badge variant={getStatusBadgeVariant(workRequest.status)} data-testid="badge-status">
                    {workRequest.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div>
                  <Label className="text-muted-foreground">Task Title</Label>
                  <p className="mt-1 font-medium text-lg" data-testid="text-title">
                    {workRequest.title}
                  </p>
                </div>

                {/* Deliverable */}
                {workRequest.deliverableDescription && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Deliverable
                    </Label>
                    <p className="mt-1" data-testid="text-deliverable">
                      {workRequest.deliverableDescription}
                    </p>
                  </div>
                )}

                {/* Description */}
                {workRequest.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1 whitespace-pre-wrap" data-testid="text-description">
                      {workRequest.description}
                    </p>
                  </div>
                )}

                {/* Budget & Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Budget
                    </Label>
                    <p className="mt-1 text-lg font-semibold" data-testid="text-budget">
                      {formatCurrency(Number(workRequest.amount), workRequest.currency)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Currency</Label>
                    <p className="mt-1" data-testid="text-currency">
                      {workRequest.currency}
                    </p>
                  </div>
                </div>

                {/* Due Date */}
                {workRequest.dueDate && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Due Date
                    </Label>
                    <p className="mt-1" data-testid="text-due-date">
                      {new Date(workRequest.dueDate).toLocaleString()}
                    </p>
                    {workRequest.isOverdue && workRequest.status !== 'submitted' && (
                      <Badge variant="destructive" className="mt-2">
                        OVERDUE ({workRequest.daysOverdue} days)
                      </Badge>
                    )}
                  </div>
                )}

                {/* Requester / Business */}
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Requester
                  </Label>
                  <p className="mt-1 font-medium" data-testid="text-requester">
                    {workRequest.businessName || 'Unknown Business'}
                  </p>
                  {workRequest.businessEmail && (
                    <p className="text-sm text-muted-foreground">{workRequest.businessEmail}</p>
                  )}
                </div>

                {/* Contractor */}
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned Contractor
                  </Label>
                  <p className="mt-1" data-testid="text-contractor">
                    {workRequest.contractorName || 'Unassigned'}
                  </p>
                  {workRequest.contractorEmail && (
                    <p className="text-sm text-muted-foreground">{workRequest.contractorEmail}</p>
                  )}
                </div>

                {/* Project (if linked) */}
                {workRequest.projectName && (
                  <div>
                    <Label className="text-muted-foreground">Project</Label>
                    <p className="mt-1" data-testid="text-project">
                      {workRequest.projectName}
                    </p>
                  </div>
                )}

                {/* Created Date */}
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="mt-1 text-sm" data-testid="text-created-at">
                    {new Date(workRequest.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Accepted/Declined dates if applicable */}
                {workRequest.acceptedAt && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Accepted On
                    </Label>
                    <p className="mt-1 text-sm" data-testid="text-accepted-at">
                      {new Date(workRequest.acceptedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {workRequest.declinedAt && (
                  <div>
                    <Label className="text-muted-foreground">Declined On</Label>
                    <p className="mt-1 text-sm" data-testid="text-declined-at">
                      {new Date(workRequest.declinedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Details - Show if work has been submitted */}
            {workRequest.latestSubmission && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Submission Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Submission Type */}
                  <div>
                    <Label className="text-muted-foreground">Submission Type</Label>
                    <p className="mt-1 capitalize" data-testid="text-submission-type">
                      {workRequest.latestSubmission.submissionType}
                    </p>
                  </div>

                  {/* External Link / Artifact URL */}
                  {workRequest.latestSubmission.artifactUrl && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        External Link
                      </Label>
                      <a
                        href={workRequest.latestSubmission.artifactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                        data-testid="link-artifact-url"
                      >
                        {workRequest.latestSubmission.artifactUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {/* Uploaded Files */}
                  {workRequest.latestSubmission.deliverableFiles && workRequest.latestSubmission.deliverableFiles.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Uploaded Files
                      </Label>
                      <div className="mt-2 space-y-2">
                        {workRequest.latestSubmission.deliverableFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                            data-testid={`file-${index}`}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(file.url, '_blank')}
                              data-testid={`download-file-${index}`}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deliverable Description (for physical items) */}
                  {workRequest.latestSubmission.deliverableDescription && (
                    <div>
                      <Label className="text-muted-foreground">Physical Deliverable Description</Label>
                      <p className="mt-1 whitespace-pre-wrap" data-testid="text-deliverable-description">
                        {workRequest.latestSubmission.deliverableDescription}
                      </p>
                    </div>
                  )}

                  {/* Contractor Notes */}
                  {workRequest.latestSubmission.notes && (
                    <div>
                      <Label className="text-muted-foreground">Contractor Notes</Label>
                      <p className="mt-1 whitespace-pre-wrap" data-testid="text-submission-notes">
                        {workRequest.latestSubmission.notes}
                      </p>
                    </div>
                  )}

                  {/* Submitted Date */}
                  <div>
                    <Label className="text-muted-foreground">Submitted On</Label>
                    <p className="mt-1 text-sm" data-testid="text-submitted-at">
                      {new Date(workRequest.latestSubmission.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Version */}
                  {workRequest.latestSubmission.version > 1 && (
                    <div>
                      <Badge variant="outline" data-testid="badge-version">
                        Version {workRequest.latestSubmission.version}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Work request not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
