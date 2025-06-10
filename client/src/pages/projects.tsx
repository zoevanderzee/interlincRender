import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Clock, DollarSign, FileText, Search, Filter, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const submissionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
});

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);

  // File upload state
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  // Form for work submission
  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Fetch unified dashboard data
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['/api/dashboard'],
  });

  // Extract all data from unified dashboard source
  const contracts = (dashboardData as any)?.contracts || [];
  const contractors = (dashboardData as any)?.contractors || [];
  const milestones = (dashboardData as any)?.milestones || [];
  const payments = (dashboardData as any)?.payments || [];
  
  // Get financial stats
  const totalPendingValue = (dashboardData as any)?.stats?.totalPendingValue || 0;
  const paymentsProcessed = (dashboardData as any)?.stats?.paymentsProcessed || 0;

  // Filter milestones by search term and status
  const filteredMilestones = milestones.filter((milestone: any) => {
    const matchesSearch = searchTerm === "" || 
      milestone.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || milestone.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  // Handle view milestone
  const handleViewMilestone = (id: number) => {
    console.log("View milestone:", id);
  };

  // Handle work submission
  const handleSubmitWork = (contractId: number) => {
    setSelectedContractId(contractId);
    setShowSubmissionModal(true);
  };

  // File upload handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachmentFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit work mutation
  const submitWorkMutation = useMutation({
    mutationFn: async (data: { contractId: number; title: string; description: string; files: File[] }) => {
      const formData = new FormData();
      formData.append('contractId', data.contractId.toString());
      formData.append('title', data.title);
      formData.append('description', data.description);
      
      data.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      return apiRequest('/api/submissions', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Work Submitted",
        description: "Your work has been submitted successfully and is pending review.",
      });
      setShowSubmissionModal(false);
      setAttachmentFiles([]);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your work. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof submissionSchema>) => {
    if (selectedContractId) {
      submitWorkMutation.mutate({
        contractId: selectedContractId,
        title: values.title,
        description: values.description,
        files: attachmentFiles,
      });
    }
  };

  // Show loading state
  if (isLoadingDashboard) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-zinc-800 rounded w-1/3"></div>
        <div className="h-10 bg-zinc-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-zinc-800 rounded"></div>
          <div className="h-32 bg-zinc-800 rounded"></div>
          <div className="h-32 bg-zinc-800 rounded"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-zinc-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const isContractor = user?.role === 'contractor';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-zinc-400 mt-1">
            {isContractor ? "Manage your active assignments and deliverables" : "Monitor project progress and milestones"}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Projects</CardTitle>
            <FileText className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{contracts.filter((c: any) => c.status === 'active').length}</div>
            <p className="text-xs text-zinc-500">
              {contracts.length} total contracts
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Pending Milestones</CardTitle>
            <Clock className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{milestones.filter((m: any) => m.status === 'pending').length}</div>
            <p className="text-xs text-zinc-500">
              {milestones.length} total milestones
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              {isContractor ? "Earnings Pending" : "Pending Payments"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalPendingValue}</div>
            <p className="text-xs text-zinc-500">
              ${paymentsProcessed} processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search projects or milestones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-700 text-white">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>

        {(searchTerm || statusFilter !== "all") && (
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="border-zinc-700 text-white hover:bg-zinc-800"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Projects Content */}
      <div className="space-y-6">
        {isContractor && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Your Assignments</h2>
            <div className="grid gap-4">
              {contracts.map((contract: any) => (
                <Card key={contract.id} className="p-6 border border-zinc-800 bg-zinc-900">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{contract.title}</h3>
                      <p className="text-sm text-zinc-400">Contract #{contract.id}</p>
                    </div>
                    <Badge 
                      variant={contract.status === 'active' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {contract.status}
                    </Badge>
                  </div>
                  
                  <p className="text-zinc-300 mb-4">{contract.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-zinc-400 text-sm">Total Value:</span>
                      <div className="text-white font-semibold">${contract.totalAmount}</div>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-sm">End Date:</span>
                      <div className="text-white">
                        {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Not specified'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                      onClick={() => handleSubmitWork(contract.id)}
                    >
                      Submit Work
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-700 text-white hover:bg-zinc-800"
                      size="sm"
                      onClick={() => handleViewMilestone(contract.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}

              {contracts.length === 0 && (
                <Card className="p-8 border border-zinc-800 bg-zinc-900 text-center">
                  <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Active Assignments</h3>
                  <p className="text-zinc-400">
                    You don't have any active project assignments at the moment.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Milestones Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            {isContractor ? "Your Milestones" : "Project Milestones"}
          </h2>
          
          <div className="grid gap-4">
            {filteredMilestones.map((milestone: any) => {
              const contract = contracts.find((c: any) => c.id === milestone.contractId);
              
              return (
                <Card key={milestone.id} className="p-6 border border-zinc-800 bg-zinc-900">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{milestone.name}</h3>
                      <p className="text-sm text-zinc-400">
                        {contract?.title} • Milestone #{milestone.id}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        milestone.status === 'completed' ? 'default' :
                        milestone.status === 'in_progress' ? 'secondary' :
                        'outline'
                      }
                      className="capitalize"
                    >
                      {milestone.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-zinc-300 mb-4">{milestone.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-zinc-400 text-sm">Payment:</span>
                      <div className="text-white font-semibold">${milestone.paymentAmount}</div>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-sm">Due Date:</span>
                      <div className="text-white">
                        {new Date(milestone.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-sm">Progress:</span>
                      <div className="text-white">{milestone.progress}%</div>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-sm">Auto-Pay:</span>
                      <div className="text-white">
                        {milestone.autoPayEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="border-zinc-700 text-white hover:bg-zinc-800"
                      size="sm"
                      onClick={() => handleViewMilestone(milestone.id)}
                    >
                      View Details
                    </Button>
                    {isContractor && milestone.status === 'pending' && (
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                        onClick={() => handleSubmitWork(milestone.contractId)}
                      >
                        Submit Work
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}

            {filteredMilestones.length === 0 && (
              <Card className="p-8 border border-zinc-800 bg-zinc-900 text-center">
                <Clock className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Milestones Found</h3>
                <p className="text-zinc-400">
                  {searchTerm || statusFilter !== "all" 
                    ? "No milestones match your current filters."
                    : "No milestones available at the moment."
                  }
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Work Submission Modal */}
      <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Submit Work</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submission Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief title for your submission"
                        className="bg-zinc-800 border-zinc-700 text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your completed work and any relevant details"
                        className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Attachments (Optional)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-zinc-400 file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                />
                
                {attachmentFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachmentFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                        <span className="text-sm text-zinc-300">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-zinc-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowSubmissionModal(false)}
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={submitWorkMutation.isPending}
                >
                  {submitWorkMutation.isPending ? 'Submitting...' : 'Submit Work'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}