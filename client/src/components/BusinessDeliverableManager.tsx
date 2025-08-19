import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Archive,
  Eye,
  Copy,
  FolderDown
} from "lucide-react";
import { format } from 'date-fns';

interface DeliverableFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface SubmittedDeliverable {
  id: number;
  contractId: number;
  name: string;
  description: string;
  status: string;
  submittedAt: string;
  contractorId: number;
  contractorName: string;
  paymentAmount: string;
  deliverableFiles?: DeliverableFile[];
  deliverableDescription?: string;
  submissionType?: string;
}

interface BusinessDeliverableManagerProps {
  businessId: number;
}

export function BusinessDeliverableManager({ businessId }: BusinessDeliverableManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeliverable, setSelectedDeliverable] = useState<SubmittedDeliverable | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [exportInProgress, setExportInProgress] = useState(false);

  // Fetch submitted deliverables for this business
  const { data: deliverables = [], isLoading } = useQuery({
    queryKey: ["/api/deliverables/submitted", businessId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/deliverables/submitted?businessId=${businessId}`);
      return response.json();
    },
  });

  // Mutation for approving/rejecting deliverables
  const reviewMutation = useMutation({
    mutationFn: async ({ deliverableId, action, notes }: { deliverableId: number; action: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/deliverables/${deliverableId}/${action}`, {
        approvalNotes: notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables/submitted"] });
      setSelectedDeliverable(null);
      setReviewFeedback("");
      toast({
        title: "Review Submitted",
        description: "The deliverable has been reviewed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-yellow-600';
      case 'approved': return 'bg-green-600';
      case 'rejected': return 'bg-red-600';
      case 'needs_revision': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const handleDownloadAll = async (deliverable: SubmittedDeliverable) => {
    if (!deliverable.deliverableFiles?.length) {
      toast({
        title: "No Files",
        description: "This deliverable has no files to download.",
        variant: "destructive",
      });
      return;
    }

    setExportInProgress(true);
    try {
      // Download each file sequentially
      for (const file of deliverable.deliverableFiles) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast({
        title: "Download Complete",
        description: `Downloaded ${deliverable.deliverableFiles.length} files successfully.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Some files may not have downloaded correctly.",
        variant: "destructive",
      });
    } finally {
      setExportInProgress(false);
    }
  };

  const handleExportData = (deliverable: SubmittedDeliverable) => {
    const exportData = {
      deliverable: {
        id: deliverable.id,
        name: deliverable.name,
        description: deliverable.description,
        contractor: deliverable.contractorName,
        submittedAt: deliverable.submittedAt,
        status: deliverable.status,
        paymentAmount: deliverable.paymentAmount,
        submissionType: deliverable.submissionType,
        submissionDescription: deliverable.deliverableDescription
      },
      files: deliverable.deliverableFiles?.map(file => ({
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size
      })) || []
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deliverable-${deliverable.name}-${deliverable.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Deliverable data exported as JSON file.",
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading submitted deliverables...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Submitted Deliverables</CardTitle>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No deliverables have been submitted yet.
            </div>
          ) : (
            <div className="space-y-4">
              {deliverables.map((deliverable: SubmittedDeliverable) => (
                <Card key={deliverable.id} className="bg-zinc-800 border-zinc-700">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-white font-medium">{deliverable.name}</h3>
                            <Badge className={`${getStatusColor(deliverable.status)} text-white`}>
                              {deliverable.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{deliverable.description}</p>
                          <div className="text-xs text-gray-500">
                            Submitted by {deliverable.contractorName} on {format(new Date(deliverable.submittedAt), 'PPp')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">${deliverable.paymentAmount}</div>
                        </div>
                      </div>

                      {/* Submission Details */}
                      {deliverable.deliverableDescription && (
                        <div className="bg-zinc-700 rounded p-3">
                          <Label className="text-white text-sm font-medium">Submission Notes:</Label>
                          <p className="text-gray-300 text-sm mt-1">{deliverable.deliverableDescription}</p>
                        </div>
                      )}

                      {/* Files */}
                      {deliverable.deliverableFiles && deliverable.deliverableFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-white text-sm font-medium">
                            Files ({deliverable.deliverableFiles.length}):
                          </Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {deliverable.deliverableFiles.map((file, idx) => (
                              <div key={idx} className="bg-zinc-700 rounded p-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-gray-300 text-sm font-medium">{file.name}</div>
                                    <div className="text-gray-400 text-xs">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-blue-400 hover:bg-blue-400/10"
                                      onClick={() => window.open(file.url, '_blank')}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-green-400 hover:bg-green-400/10"
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = file.url;
                                        link.download = file.name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-purple-400 hover:bg-purple-400/10"
                                      onClick={() => {
                                        navigator.clipboard.writeText(file.url);
                                        toast({
                                          title: "URL Copied",
                                          description: "File URL copied to clipboard",
                                        });
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator className="bg-zinc-600" />

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {deliverable.deliverableFiles && deliverable.deliverableFiles.length > 0 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                onClick={() => handleDownloadAll(deliverable)}
                                disabled={exportInProgress}
                              >
                                <FolderDown className="h-3 w-3 mr-1" />
                                Download All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                onClick={() => handleExportData(deliverable)}
                              >
                                <Archive className="h-3 w-3 mr-1" />
                                Export Data
                              </Button>
                            </>
                          )}
                        </div>

                        {deliverable.status === 'completed' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => setSelectedDeliverable(deliverable)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Review & Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedDeliverable && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Review: {selectedDeliverable.name}</CardTitle>
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
                onClick={() => reviewMutation.mutate({ 
                  deliverableId: selectedDeliverable.id, 
                  action: 'approve',
                  notes: reviewFeedback 
                })}
                disabled={reviewMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Release ${selectedDeliverable.paymentAmount}
              </Button>
              
              <Button
                onClick={() => reviewMutation.mutate({ 
                  deliverableId: selectedDeliverable.id, 
                  action: 'reject',
                  notes: reviewFeedback 
                })}
                disabled={reviewMutation.isPending}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              
              <Button
                onClick={() => {
                  setSelectedDeliverable(null);
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