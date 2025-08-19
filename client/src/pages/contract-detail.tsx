import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Users, 
  Briefcase, 
  FileText, 
  Download, 
  Building,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import ContractTimeline from '@/components/contracts/ContractTimeline';
import AddContractorModal from '@/components/contracts/AddContractorModal';
import { apiRequest } from '@/lib/queryClient';

type Contract = {
  id: number;
  contractName: string;
  contractCode: string;
  description: string;
  value: string;
  status: string;
  startDate: Date;
  endDate: Date;
  businessId: number;
  contractorId: number;
};

type Milestone = {
  id: number;
  name: string;
  description: string;
  status: string;
  contractId: number;
  dueDate: Date;
  paymentAmount: string;
  progress: number;
};

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  title?: string;
  workerType?: string;
  companyLogo?: string;
};

export default function ContractDetailPage() {
  const { id: contractId } = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data queries
  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery({
    queryKey: ['/api/contracts'],
  });

  const contract = contracts.find((c: Contract) => c.id === parseInt(contractId || '0'));

  const { data: milestones = [], isLoading: isLoadingMilestones } = useQuery({
    queryKey: ['/api/milestones'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['/api/business-workers/contractors'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/business-workers/contractors`);
      return response.json();
    },
    enabled: !!contract?.businessId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['/api/payments'],
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents'],
  });

  const { data: workSubmissions = [], isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['/api/work-submissions/business', contract?.businessId],
    enabled: !!contract?.businessId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/contracts/${contractId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete project');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: 'Project deleted successfully' });
      setLocation('/projects');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete project', 
        description: error.message || 'An error occurred while deleting the project',
        variant: 'destructive' 
      });
    }
  });

  // Milestone mutations
  const completeMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const response = await apiRequest('PATCH', `/api/milestones/${milestoneId}`, { status: 'completed' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete milestone');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      toast({ title: 'Milestone marked as complete' });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const response = await apiRequest('POST', `/api/milestones/${milestoneId}/approve`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve milestone');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({ title: 'Milestone approved and payment initiated' });
    }
  });

  // Computed values
  const contractMilestones = useMemo(() => 
    milestones.filter((m: Milestone) => m.contractId === parseInt(contractId || '0')),
    [milestones, contractId]
  );

  const getAssociatedContractors = () => {
    if (!contract) return [];
    return users.filter((user: User) => user.id === contract.contractorId);
  };

  const getContractorCount = () => getAssociatedContractors().length;

  const totalContractValue = parseFloat(contract?.value || '0');
  const totalPaid = payments
    .filter((p: any) => contractMilestones.some((m: Milestone) => m.id === p.milestoneId))
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
  const remainingAmount = totalContractValue - totalPaid;
  const progress = totalContractValue > 0 ? ((totalContractValue - remainingAmount) / totalContractValue) * 100 : 0;

  const getMilestonesByContractor = () => {
    const contractorMap = new Map();
    
    getAssociatedContractors().forEach((contractor: User) => {
      const contractorMilestones = contractMilestones.filter((m: Milestone) => 
        m.contractId === contract?.id
      );
      
      if (contractorMilestones.length > 0) {
        contractorMap.set(contractor.id, {
          contractor,
          milestones: contractorMilestones
        });
      }
    });
    
    return Array.from(contractorMap.values());
  };

  // Handlers
  const handleMilestoneComplete = (milestoneId: number) => {
    completeMutation.mutate(milestoneId);
  };

  const handleMilestoneApprove = (milestoneId: number) => {
    approveMutation.mutate(milestoneId);
  };

  const handleDeleteContract = () => {
    deleteMutation.mutate();
  };

  if (isLoadingContracts) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-zinc-800 rounded"></div>
          <div className="h-32 bg-zinc-800 rounded"></div>
        </div>
      </Layout>
    );
  }

  if (!contract) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-white mb-2">Project Not Found</h2>
          <p className="text-zinc-400 mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/projects')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/projects')}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{contract.contractName}</h1>
              <p className="text-zinc-400">{contract.contractCode}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="submissions">Work Submitted</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-green-500/20 rounded-xl">
                        <DollarSign className="h-6 w-6 text-green-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Contract Value</p>
                        <p className="text-2xl font-bold">${totalContractValue.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-500/20 rounded-xl">
                        <Users className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Active Workers</p>
                        <p className="text-2xl font-bold">{getContractorCount()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-purple-500/20 rounded-xl">
                        <Briefcase className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Progress</p>
                        <p className="text-2xl font-bold">{progress.toFixed(0)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-orange-500/20 rounded-xl">
                        <Clock className="h-6 w-6 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Due Date</p>
                        <p className="text-2xl font-bold">
                          {contract.endDate ? format(new Date(contract.endDate), 'MMM d') : 'TBD'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h4 className="font-semibold mb-3">Description</h4>
                        <p className="text-muted-foreground">{contract.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-2">Start Date</h4>
                          <p className="text-muted-foreground">
                            {contract.startDate ? format(new Date(contract.startDate), 'MMM dd, yyyy') : 'Not scheduled'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">End Date</h4>
                          <p className="text-muted-foreground">
                            {contract.endDate ? format(new Date(contract.endDate), 'MMM dd, yyyy') : 'Not scheduled'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Team Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getAssociatedContractors().length > 0 ? (
                        <div className="space-y-4">
                          {getAssociatedContractors().map((contractor: User) => (
                            <div key={contractor.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                  {contractor.firstName?.[0]}{contractor.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-semibold">{contractor.firstName} {contractor.lastName}</p>
                                  <p className="text-sm text-muted-foreground">{contractor.email}</p>
                                </div>
                              </div>
                              <Badge variant="secondary">Active</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-semibold mb-2">No Team Members</h3>
                          <p className="text-muted-foreground mb-6">Add contractors to get started</p>
                          <AddContractorModal 
                            contractId={contractId} 
                            contractors={contractors}
                            onSuccess={() => {
                              queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
                            }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>Total Budget</span>
                          <span className="font-medium">${totalContractValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Paid</span>
                          <span className="text-green-600">${totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Remaining</span>
                          <span>${remainingAmount.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <AddContractorModal 
                        contractId={contractId} 
                        contractors={contractors}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
                        }}
                      />
                      <Button variant="outline" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Export Contract
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="milestones" className="mt-6">
            <ContractTimeline 
              contract={contract}
              milestones={contractMilestones}
              onMilestoneComplete={handleMilestoneComplete}
              onMilestoneApprove={handleMilestoneApprove}
            />
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            {isLoadingSubmissions ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-48 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            ) : workSubmissions.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Work Submitted by Contractors</h3>
                {workSubmissions.map((submission: any) => (
                  <Card key={submission.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-medium">{submission.title}</h4>
                            <Badge variant={
                              submission.status === 'approved' ? 'default' : 
                              submission.status === 'rejected' ? 'destructive' : 
                              'secondary'
                            }>
                              {submission.status === 'approved' ? '✓ Approved' : 
                               submission.status === 'rejected' ? '✗ Rejected' : 
                               '⏳ Pending Review'}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground mb-3">{submission.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Submitted: {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}</span>
                            </div>
                            {submission.reviewedAt && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                <span>Reviewed: {format(new Date(submission.reviewedAt), 'MMM dd, yyyy')}</span>
                              </div>
                            )}
                          </div>

                          {submission.attachmentUrls && submission.attachmentUrls.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium mb-2">Attachments:</h5>
                              <div className="flex flex-wrap gap-2">
                                {submission.attachmentUrls.map((url: string, index: number) => (
                                  <Button key={index} variant="outline" size="sm" asChild>
                                    <a href={url} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-3 w-3 mr-1" />
                                      File {index + 1}
                                    </a>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {submission.reviewNotes && (
                            <div className="mt-3 p-3 bg-muted rounded">
                              <h5 className="text-sm font-medium mb-1">Review Notes:</h5>
                              <p className="text-sm">{submission.reviewNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Work Submitted</h3>
                  <p className="text-muted-foreground">No work has been submitted for this project yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{doc.fileName}</span>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No documents uploaded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment: any) => {
                      const milestone = milestones.find((m: Milestone) => m.id === payment.milestoneId);
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">${parseFloat(payment.amount).toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">
                              {milestone ? milestone.name : 'Project Payment'}
                            </p>
                          </div>
                          <Badge variant={
                            payment.status === 'completed' ? 'default' :
                            payment.status === 'processing' ? 'secondary' :
                            'outline'
                          }>
                            {payment.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No payments recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this project? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}