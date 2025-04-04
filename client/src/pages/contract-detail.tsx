import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Contract, Milestone, User } from '@shared/schema';
import Layout from '@/components/layout/Layout';
import ContractTimeline from '@/components/contracts/ContractTimeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getQueryFn, apiRequest, queryClient } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Download, FileText, User as UserIcon, Calendar, DollarSign, Clock, AlertTriangle, CheckCircle, Building } from 'lucide-react';

export default function ContractDetailPage() {
  const [, params] = useRoute('/contract/:id');
  const contractId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Helper function to get associated contractors
  const getAssociatedContractors = () => {
    if (!contract || !contractors || !Array.isArray(contractors)) return [];
    return contractors.filter((c: User) => c.role === 'contractor' && c.id === (contract as Contract).contractorId);
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

  // Fetch contract details
  const { data: contract, isLoading: isLoadingContract } = useQuery({
    queryKey: ['/api/contracts', contractId],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: contractId > 0,
  });

  // Fetch milestones for this contract
  const { data: milestones = [], isLoading: isLoadingMilestones } = useQuery({
    queryKey: ['/api/milestones', { contractId }],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: contractId > 0,
  });

  // Fetch all contractors
  const { data: contractors = [], isLoading: isLoadingContractors } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Fetch documents for this contract
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/documents', { contractId }],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: contractId > 0,
  });

  // Fetch payments for this contract
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/payments', { contractId }],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: contractId > 0,
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

  // Calculate contract stats
  const totalValue = parseFloat(contract.value);
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(
    (m: Milestone) => m.status === 'completed' || m.status === 'approved'
  ).length;
  const progress = totalMilestones > 0 
    ? Math.round((completedMilestones / totalMilestones) * 100) 
    : 0;
  
  const totalPaid = payments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);
  
  const remainingAmount = totalValue - totalPaid;

  // Format dates
  const startDate = contract.startDate ? format(new Date(contract.startDate), 'MMMM d, yyyy') : 'Not specified';
  const endDate = contract.endDate ? format(new Date(contract.endDate), 'MMMM d, yyyy') : 'Not specified';

  return (
    <Layout>
      <div className="container py-6">
        {/* Contract header */}
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
          <div className="mt-4 md:mt-0">
            <Button variant="outline" className="mr-2">
              Export Contract
            </Button>
            <Button>Edit Contract</Button>
          </div>
        </div>

        {/* Status banner */}
        <div 
          className={`p-4 rounded-lg mb-6 flex items-center
            ${contract.status === 'active' ? 'bg-green-50 border border-green-200' : 
              contract.status === 'pending' ? 'bg-yellow-50 border border-yellow-200' : 
              'bg-red-50 border border-red-200'}`}
        >
          <div className="mr-3">
            {contract.status === 'active' ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : contract.status === 'pending' ? (
              <Clock className="h-6 w-6 text-yellow-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <div>
            <h3 className="font-medium">
              {contract.status === 'active' 
                ? 'Active Contract' 
                : contract.status === 'pending' 
                ? 'Pending Contract' 
                : 'Contract Issue'}
            </h3>
            <p className="text-sm">
              {contract.status === 'active' 
                ? 'This contract is currently active and in progress.' 
                : contract.status === 'pending' 
                ? 'This contract is waiting for approval or activation.' 
                : 'This contract has been cancelled or has issues that need attention.'}
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <DollarSign className="h-5 w-5 mr-1 text-primary-500" />
                ${totalValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Contract: {contract.contractCode}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {progress}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedMilestones} of {totalMilestones} milestones completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Amount Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <DollarSign className="h-5 w-5 mr-1 text-green-500" />
                ${totalPaid.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {payments.filter((p: any) => p.status === 'completed').length} payment(s) processed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remaining
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <DollarSign className="h-5 w-5 mr-1 text-accent-500" />
                ${remainingAmount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalMilestones - completedMilestones} milestone(s) remaining
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Contract Details</CardTitle>
                    <CardDescription>
                      Summary of the contract between your business and the contractor
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
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Contract Dates</h4>
                          <p><span className="font-medium">Start:</span> {startDate}</p>
                          <p><span className="font-medium">End:</span> {endDate}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Contract Value</h4>
                          <p><span className="font-medium">Total:</span> ${totalValue.toFixed(2)}</p>
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
                    <CardTitle>Contractors</CardTitle>
                    <CardDescription>
                      Information about assigned contractors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingContractors ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-12 w-12 rounded-full bg-primary-100"></div>
                        <div className="h-4 w-full rounded bg-primary-100"></div>
                        <div className="h-4 w-2/3 rounded bg-primary-100"></div>
                      </div>
                    ) : getAssociatedContractors().length > 0 ? (
                      <div className="space-y-6">
                        {getAssociatedContractors().map((contractor: User) => (
                          <div key={contractor.id}>
                            <div className="flex items-center mb-4">
                              <div className="h-16 w-16 rounded-md bg-primary-100 flex items-center justify-center text-primary-500 overflow-hidden">
                                {contractor.companyLogo ? (
                                  <img 
                                    src={contractor.companyLogo} 
                                    alt={contractor.companyName || "Company logo"} 
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Building className="h-8 w-8" />
                                )}
                              </div>
                              <div className="ml-3">
                                <h3 className="font-medium">{contractor.companyName || "Company"}</h3>
                                <p className="text-sm text-muted-foreground">{contractor.title || 'No title'}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-sm"><span className="font-medium">Email:</span> {contractor.email}</p>
                              {contractor.industry && (
                                <p className="text-sm"><span className="font-medium">Industry:</span> {contractor.industry}</p>
                              )}
                              {contractor.website && (
                                <p className="text-sm"><span className="font-medium">Website:</span> {contractor.website}</p>
                              )}
                              <p className="text-sm"><span className="font-medium">Worker Type:</span> {contractor.workerType || 'Sub Contractor'}</p>
                            </div>
                            
                            {getAssociatedContractors().length > 1 && <Separator className="my-4" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No contractor information available.</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm">
                      Add Contractor
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="milestones">
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
                  <Card key={item.contractor.id}>
                    <CardHeader>
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
                            {item.contractor.companyName || "Company"}
                          </CardTitle>
                          <CardDescription>
                            {item.contractor.title || item.contractor.industry || 'Sub Contractor'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {item.milestones.length > 0 && contract ? (
                        <ContractTimeline 
                          contract={contract as Contract} 
                          milestones={item.milestones}
                          contractor={item.contractor}
                          onMilestoneComplete={handleMilestoneComplete}
                          onMilestoneApprove={handleMilestoneApprove}
                        />
                      ) : (
                        <p>No milestones have been defined for this contractor.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                <div className="flex justify-center mt-6">
                  <Button variant="outline">
                    Add New Milestone
                  </Button>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Milestones Found</CardTitle>
                  <CardDescription>
                    No milestones have been defined for this contract yet.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Button>
                      Add First Milestone
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Contract Documents</CardTitle>
                <CardDescription>
                  Access and manage all contract-related documents
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
                  <p>No documents have been uploaded for this contract.</p>
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
                  Track all payments related to this contract
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
                  <p>No payments have been made for this contract yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}