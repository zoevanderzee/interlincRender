import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
import { Contract, Milestone, User } from '@shared/schema';
import Layout from '@/components/layout/Layout';
import ContractTimeline from '@/components/contracts/ContractTimeline';
import AddContractorModal from '@/components/contracts/AddContractorModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getQueryFn, apiRequest, queryClient } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { 
  Download, 
  FileText, 
  User as UserIcon, 
  Calendar, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Building,
  Home,
  ArrowLeft,
  Layers
} from 'lucide-react';

export default function ContractDetailPage() {
  const [, params] = useRoute('/contract/:id');
  const [, navigate] = useLocation();
  const contractId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Block contractors from accessing contract details entirely
  if (user?.role === 'contractor') {
    navigate('/work-requests');
    return null;
  }
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Helper function to get associated contractors
  const getAssociatedContractors = () => {
    if (!contract || !contractors || !Array.isArray(contractors)) return [];
    
    // Explicitly cast contract to any to access the contractorId property
    const contractData = contract as any;
    
    // Log what we're seeing
    console.log("Contractor access - Contract data:", contractData);
    
    // Get contractor ID from the contract
    const contractorId = contractData.contractorId;
    console.log("Contractor access - Contractor ID:", contractorId);
    
    // If no contractor ID, return empty array
    if (!contractorId) return [];
    
    // Find matching contractors 
    const matchingContractors = contractors.filter(c => c.id === contractorId);
    console.log("Contractor access - Matching contractors:", matchingContractors);
    
    return matchingContractors;
  };
  
  // Helper function to count associated contractors
  const getContractorCount = () => {
    return getAssociatedContractors().length;
  };
  
  // Helper function to group milestones by contractor
  const getMilestonesByContractor = () => {
    if (!milestones || !contract || !Array.isArray(milestones)) return [];
    
    const contractMilestones = milestones.filter((m: Milestone) => m.contractId === (contract as Contract).id);
    
    // For now, all milestones belong to the same contractor
    // In a real multi-contractor scenario, milestones would be linked to specific contractors
    if (getAssociatedContractors().length > 0) {
      return [{
        contractor: getAssociatedContractors()[0],
        milestones: contractMilestones
      }];
    }
    
    return [];
  };

  // Custom query function to handle 404 errors properly
  const contractQueryFn = async ({ queryKey }: { queryKey: (string | number)[] }) => {
    const endpoint = `/api/contracts/${contractId}`;
    
    // Get stored user data for authentication fallback
    const headers: Record<string, string> = {};
    const storedUser = localStorage.getItem('creativlinc_user');
    
    // Add X-User-ID header from localStorage if available
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.id) {
          headers['X-User-ID'] = parsedUser.id.toString();
          console.log(`Adding X-User-ID header to contract detail request:`, parsedUser.id);
        }
      } catch (e) {
        console.error("Error parsing stored user for contract detail request:", e);
      }
    }
    
    const res = await fetch(endpoint, {
      credentials: "include",
      headers: headers
    });
    
    if (res.status === 404) {
      throw new Error("Project not found");
    }
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    
    return res.json();
  };

  // Fetch project details
  const { data: contract, isLoading: isLoadingContract, error: contractError } = useQuery<Contract>({
    queryKey: ['/api/contracts', contractId],
    queryFn: contractQueryFn,
    enabled: contractId > 0,
    staleTime: 0, // Disable caching to ensure fresh data
  });

  // Fetch milestones for this project
  const { data: milestones = [], isLoading: isLoadingMilestones } = useQuery<Milestone[]>({
    queryKey: ['/api/milestones', { contractId }],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: contractId > 0 && !contractError,
  });

  // Fetch contractors from dashboard data which includes connected contractors
  const { data: dashboardData, isLoading: isLoadingContractors } = useQuery({
    queryKey: ['/api/dashboard'],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: !contractError,
  });
  
  const contractors = dashboardData?.contractors || [];

  // Fetch documents for this project
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<any[]>({
    queryKey: ['/api/documents', { contractId }],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: contractId > 0 && !contractError,
  });

  // Fetch payments for this project
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: ['/api/payments', { contractId }],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: contractId > 0 && !contractError,
  });

  // Fetch work submissions for this project
  const { data: workSubmissions = [], isLoading: isLoadingSubmissions } = useQuery<any[]>({
    queryKey: ['/api/work-submissions'],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: contractId > 0 && !contractError,
    select: (data) => data.filter((submission: any) => submission.contractId === contractId),
  });

  // Handle milestone completion
  const handleMilestoneComplete = async (milestoneId: number) => {
    try {
      await apiRequest(`/api/milestones/${milestoneId}`, 'PATCH', { 
        status: 'completed' 
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      
      toast({
        title: "Milestone marked as completed",
        description: "The contractor will be notified.",
      });
    } catch (error) {
      toast({
        title: "Error updating milestone",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Handle milestone approval
  const handleMilestoneApprove = async (milestoneId: number) => {
    try {
      await apiRequest(`/api/milestones/${milestoneId}`, 'PATCH', { 
        status: 'approved' 
      });
      
      // Create a payment for this milestone
      const milestone = milestones.find((m: Milestone) => m.id === milestoneId);
      
      if (milestone) {
        await apiRequest('/api/payments', 'POST', {
          contractId,
          milestoneId,
          amount: milestone.paymentAmount,
          scheduledDate: new Date(),
          status: 'processing',
          notes: `Automatic payment for milestone: ${milestone.name}`,
        });
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      
      toast({
        title: "Milestone approved",
        description: "Payment has been initiated.",
      });
    } catch (error) {
      toast({
        title: "Error approving milestone",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  // Handle project deletion
  const handleDeleteContract = async () => {
    try {
      // Check if the project has associated contractors
      if (getContractorCount() > 0) {
        toast({
          title: "Cannot delete project",
          description: "This project has contractors assigned. Remove all contractors before deleting.",
          variant: "destructive",
        });
        return;
      }
      
      // Get stored user data for authentication fallback
      const storedUser = localStorage.getItem('creativlinc_user');
      // Initialize headers with proper type
      const headers: Record<string, string> = {};
      
      // Add X-User-ID header from localStorage if available
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            headers['X-User-ID'] = parsedUser.id.toString();
            console.log("Adding X-User-ID header to delete request:", parsedUser.id);
          }
        } catch (e) {
          console.error("Error parsing stored user for delete request:", e);
        }
      }
      
      // Log the header value if it exists
      if (headers['X-User-ID']) {
        console.log(`Adding X-User-ID header to /api/contracts/${contractId} request:`, headers['X-User-ID']);
      }
      
      // Note: apiRequest method signature is (url, method, data, headers)
      await apiRequest(`/api/contracts/${contractId}`, 'delete', undefined, headers);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      
      toast({
        title: "Project deleted",
        description: "The project has been successfully removed.",
      });
      
      // Navigate back to the contracts list
      navigate('/contracts');
    } catch (error) {
      console.error("Delete project error:", error);
      toast({
        title: "Error deleting project",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Show error state if there's a project error
  if (contractError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <Card className="w-full max-w-md mx-4 border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-7 w-7 text-yellow-500" />
              <CardTitle className="text-2xl font-bold text-white">Project Not Found</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="text-4xl font-bold text-center bg-gradient-to-r from-red-500 to-yellow-500 text-transparent bg-clip-text">
                404
              </div>
              
              <p className="text-gray-400 text-center">
                The project you are looking for doesn't exist or has been removed.
              </p>
              
              <div className="mt-2 p-4 bg-zinc-800 rounded-md border border-zinc-700">
                <h3 className="text-sm font-medium text-white mb-2">Possible reasons:</h3>
                <ul className="text-sm text-gray-400 space-y-1 list-disc pl-5">
                  <li>The project ID might be incorrect</li>
                  <li>The project may have been removed</li>
                  <li>You might not have permission to view this project</li>
                  <li>There might be a temporary system error</li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2 pt-0">
            <Link href="/">
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </Link>
            
            <div className="flex space-x-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              
              <Link href="/contracts">
                <Button 
                  variant="outline" 
                  className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white"
                >
                  <Layers className="mr-2 h-4 w-4" />
                  View Projects
                </Button>
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoadingContract || !contract) {
    return (
      <Layout>
        <div className="container py-6">
          <div className="flex items-center space-x-4 animate-pulse">
            <div className="h-12 w-12 rounded-full bg-primary-100"></div>
            <div className="space-y-2">
              <div className="h-4 w-[250px] rounded bg-primary-100"></div>
              <div className="h-4 w-[200px] rounded bg-primary-100"></div>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="h-8 w-[300px] rounded bg-primary-100"></div>
            <div className="h-24 rounded bg-primary-100"></div>
            <div className="h-64 rounded bg-primary-100"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate project stats
  // Check if project value exists and is valid before parsing
  const contractValue = contract.value || "0";
  const totalValue = isNaN(parseFloat(contractValue)) ? 0 : parseFloat(contractValue);
  
  // Get virtual payments (project value payments) from the payments array
  const virtualPayments = payments.filter((p: any) => p.isVirtual === true);
  
  // If we have virtual payments but no project value, use the virtual payment amount
  const totalContractValue = totalValue === 0 && virtualPayments.length > 0 
    ? parseFloat(virtualPayments[0].amount || "0") 
    : totalValue;
  
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(
    (m: Milestone) => m.status === 'completed' || m.status === 'approved'
  ).length;
  const progress = totalMilestones > 0 
    ? Math.round((completedMilestones / totalMilestones) * 100) 
    : 0;
  
  const totalPaid = payments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, payment: any) => {
      // Parse amount safely
      const amount = isNaN(parseFloat(payment.amount)) ? 0 : parseFloat(payment.amount);
      return sum + amount;
    }, 0);
  
  const remainingAmount = totalContractValue - totalPaid;

  // Format dates
  const startDate = contract.startDate ? format(new Date(contract.startDate), 'MMMM d, yyyy') : 'Not specified';
  const endDate = contract.endDate ? format(new Date(contract.endDate), 'MMMM d, yyyy') : 'Not specified';

  return (
    <Layout>
      <div className="container py-6">
        {/* Project header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary-900">{contract.contractName}</h1>
            <div className="flex items-center text-primary-500 mt-1">
              <span className="inline-flex items-center mr-4">
                <UserIcon className="h-4 w-4 mr-1" />
                {isLoadingContractors ? 'Loading contractors...' : 
                  `${getContractorCount()} contractors assigned`}
              </span>
              <span className="inline-flex items-center mr-4">
                <Calendar className="h-4 w-4 mr-1" />
                {startDate} to {endDate}
              </span>
              <span className="inline-flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Code: {contract.contractCode}
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            <Button variant="outline">
              Export Project
            </Button>
            <Button variant="outline">
              Edit Project
            </Button>
            
            {getContractorCount() === 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete Project
              </Button>
            )}
            
            {/* Delete confirmation dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    This action cannot be undone. This will permanently delete the project
                    and remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={handleDeleteContract}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Simple status indicator */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            {contract.status === 'completed' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-white text-sm">Completed</span>
              </>
            ) : contract.status === 'active' ? (
              <>
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-white text-sm">Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-white text-sm">Setup</span>
              </>
            )}
          </div>
        </div>

        {/* Simplified stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-lg font-semibold text-white">${totalContractValue.toFixed(0)}</div>
            <div className="text-xs text-zinc-400">Total</div>
          </div>
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-lg font-semibold text-white">{progress}%</div>
            <div className="text-xs text-zinc-400">Progress</div>
          </div>
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-lg font-semibold text-white">${totalPaid.toFixed(0)}</div>
            <div className="text-xs text-zinc-400">Paid</div>
          </div>
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-lg font-semibold text-white">${remainingAmount.toFixed(0)}</div>
            <div className="text-xs text-zinc-400">Remaining</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="submissions">Work Submitted</TabsTrigger>
            <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>
                      Summary of the project between your business and project workers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                        <p>{contract.description || 'No description provided.'}</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Project Dates</h4>
                          <p><span className="font-medium">Start:</span> {startDate}</p>
                          <p><span className="font-medium">End:</span> {endDate}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Project Value</h4>
                          <p><span className="font-medium">Total:</span> ${totalContractValue.toFixed(2)}</p>
                          <p><span className="font-medium">Remaining:</span> ${remainingAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Project Budget</CardTitle>
                    <CardDescription>
                      Budget allocation and spending overview
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Total Budget</span>
                          <span className="text-sm font-bold">${totalContractValue.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-zinc-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min((totalContractValue - remainingAmount) / totalContractValue * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Used: ${(totalContractValue - remainingAmount).toFixed(2)}</span>
                          <span>Remaining: ${remainingAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Quick Actions</h4>
                        <AddContractorModal 
                          contractId={contractId} 
                          contractors={contractors}
                          onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="submissions">
            {isLoadingSubmissions ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-48 bg-zinc-800 rounded"></div>
                <div className="h-32 bg-zinc-800 rounded"></div>
              </div>
            ) : workSubmissions.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Work Submitted by Contractors</h3>
                {workSubmissions.map((submission: any) => (
                  <Card key={submission.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-white font-medium">{submission.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              submission.status === 'approved' ? 'bg-green-100 text-green-800' : 
                              submission.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {submission.status === 'approved' ? '✓ Approved' : 
                               submission.status === 'rejected' ? '✗ Rejected' : 
                               '⏳ Pending Review'}
                            </span>
                          </div>
                          
                          <p className="text-zinc-400 mb-3">{submission.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-400 mb-4">
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
                              <h5 className="text-sm font-medium text-white mb-2">Attachments:</h5>
                              <div className="flex flex-wrap gap-2">
                                {submission.attachmentUrls.map((url: string, index: number) => (
                                  <a 
                                    key={index}
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                                  >
                                    <Download className="h-3 w-3" />
                                    View File {index + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {submission.reviewNotes && (
                            <div className="mt-3 p-3 bg-zinc-800 rounded">
                              <h5 className="text-sm font-medium text-white mb-1">Review Notes:</h5>
                              <p className="text-zinc-300 text-sm">{submission.reviewNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Work Submitted</h3>
                  <p className="text-zinc-400">No work has been submitted for this project yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="deliverables">
            {isLoadingMilestones ? (
              <div className="animate-pulse space-y-8">
                <div className="h-4 w-full rounded bg-primary-100"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded bg-primary-100"></div>
                  ))}
                </div>
              </div>
            ) : getMilestonesByContractor().length > 0 ? (
              <div className="space-y-10">
                {getMilestonesByContractor().map((item, index) => (
                  <Card key={item.contractor.id} className="overflow-hidden">
                    <CardHeader className="bg-zinc-950 border-b border-zinc-800">
                      <div className="flex items-center">
                        <div className="mr-4 h-12 w-12 rounded-md bg-primary-100 flex items-center justify-center text-primary-500 overflow-hidden">
                          {item.contractor.companyLogo ? (
                            <img 
                              src={item.contractor.companyLogo} 
                              alt={item.contractor.companyName || "Company logo"} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <CardTitle>
                            {item.contractor.firstName} {item.contractor.lastName}
                          </CardTitle>
                          <CardDescription>
                            {item.contractor.companyName || item.contractor.title || item.contractor.workerType || 'Contractor'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {item.milestones.length > 0 ? (
                        <div className="divide-y divide-zinc-800">
                          {item.milestones.map((deliverable, idx) => {
                            const isPending = deliverable.status === 'pending';
                            const isCompleted = deliverable.status === 'completed' || deliverable.status === 'approved';
                            const isInProgress = !isPending && !isCompleted;
                            
                            return (
                              <div key={deliverable.id} className="p-4 flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    {isCompleted ? (
                                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                    ) : isPending ? (
                                      <Clock className="h-5 w-5 text-amber-500 mr-2" />
                                    ) : (
                                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                                    )}
                                    <h3 className="font-medium text-white">
                                      {deliverable.name || `Deliverable ${idx + 1}`}
                                    </h3>
                                  </div>
                                  
                                  <div className="mt-1 text-sm text-zinc-400 ml-7">
                                    {deliverable.description || 'No description provided'}
                                  </div>
                                  
                                  <div className="mt-2 ml-7 flex flex-wrap gap-2 text-xs">
                                    {deliverable.dueDate && (
                                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Due: {format(new Date(deliverable.dueDate), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                    
                                    <span className={`px-2 py-1 rounded flex items-center ${
                                      isCompleted ? 'bg-green-900/30 text-green-400' : 
                                      isPending ? 'bg-amber-900/30 text-amber-400' : 
                                      'bg-orange-900/30 text-orange-400'
                                    }`}>
                                      {isCompleted ? 'Completed' : isPending ? 'Pending' : 'In Progress'}
                                    </span>
                                    
                                    {deliverable.paymentAmount && (
                                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 flex items-center">
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        ${parseFloat(deliverable.paymentAmount).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  {isPending && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        toast({
                                          title: "Reminder sent",
                                          description: `Reminder sent to ${item.contractor.firstName} ${item.contractor.lastName} about this deliverable.`,
                                        });
                                      }}
                                    >
                                      Send Reminder
                                    </Button>
                                  )}
                                  
                                  {!isCompleted && (
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      onClick={() => handleMilestoneComplete(deliverable.id)}
                                    >
                                      Mark Completed
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-zinc-400">
                          No deliverables have been defined for this worker.
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-zinc-950 border-t border-zinc-800 flex justify-between p-4">
                      <Button variant="outline" size="sm">
                        View Worker Profile
                      </Button>
                      <Button variant="default" size="sm">
                        Add Deliverable
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                
                <div className="flex justify-center mt-6">
                  <AddContractorModal 
                    contractId={contractId} 
                    contractors={contractors}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
                    }} 
                  />
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Deliverables Found</CardTitle>
                  <CardDescription>
                    No deliverables have been defined for this project yet. Start by adding a worker to the project.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <AddContractorModal 
                      contractId={contractId} 
                      contractors={contractors}
                      onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
                      }} 
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Project Documents</CardTitle>
                <CardDescription>
                  Access and manage all project-related documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDocuments ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded bg-primary-100"></div>
                    ))}
                  </div>
                ) : documents.length > 0 ? (
                  <div className="space-y-4">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between border p-4 rounded-lg">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded bg-primary-100 flex items-center justify-center text-primary-500">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="ml-3">
                            <h4 className="font-medium">{doc.fileName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Uploaded: {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No documents have been uploaded for this project.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button>
                  Upload New Document
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  Track all payments related to this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPayments ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded bg-primary-100"></div>
                    ))}
                  </div>
                ) : payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Date</th>
                          <th className="text-left py-3 px-2">Milestone</th>
                          <th className="text-left py-3 px-2">Amount</th>
                          <th className="text-left py-3 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment: any) => {
                          const milestone = milestones.find((m: Milestone) => m.id === payment.milestoneId);
                          return (
                            <tr key={payment.id} className="border-b">
                              <td className="py-3 px-2">
                                {format(new Date(payment.scheduledDate), 'MMM d, yyyy')}
                              </td>
                              <td className="py-3 px-2">
                                {milestone ? milestone.name : 'Unknown Milestone'}
                              </td>
                              <td className="py-3 px-2 font-medium">
                                ${parseFloat(payment.amount).toFixed(2)}
                              </td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium
                                  ${payment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                    payment.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-yellow-100 text-yellow-800'}`}>
                                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No payments have been made for this project yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Worker Progress Section - Inside project container */}
        {getAssociatedContractors().length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Active Workers</CardTitle>
              <CardDescription>
                Track progress and manage deliverables from assigned workers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getAssociatedContractors().map((contractor: User) => {
                  // Find milestone for this contractor
                  const contractorMilestone = milestones.find((m: any) => m.contractId === contractId);
                  const deliverableName = contractorMilestone?.name || "Website redesign logo";
                  const progress = contractorMilestone?.progress || 0;
                  const amount = contractorMilestone?.paymentAmount || "20";
                  const status = contractorMilestone?.status || "pending";
                  
                  return (
                    <div key={contractor.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <UserIcon size={20} className="text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                {contractor.firstName} {contractor.lastName}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium
                                ${status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                {status === 'pending' ? 'Pending' : 'Accepted'}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">{contractor.email}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-sm font-medium">{deliverableName}</div>
                            <div className="text-xs text-muted-foreground">Assignment</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-sm font-medium">${amount}</div>
                            <div className="text-xs text-muted-foreground">Payment</div>
                          </div>
                          
                          <div className="w-32">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {status === 'submitted' ? (
                              <>
                                <Button size="sm" variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                                  Reject
                                </Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                  Accept & Pay
                                </Button>
                              </>
                            ) : status === 'approved' ? (
                              <Button size="sm" disabled className="bg-green-100 text-green-800">
                                ✓ Completed
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                Waiting for delivery
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}