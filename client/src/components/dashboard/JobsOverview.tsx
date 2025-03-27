import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Calendar, 
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  Globe,
  PlusCircle,
  Coins,
  ListTodo,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Contract, User, Milestone, Payment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface JobsOverviewProps {
  contracts: Contract[];
  contractors: User[];
  milestones: Milestone[];
  payments: Payment[];
  onViewJob?: (id: number) => void;
}

interface GroupedContracts {
  [key: string]: Contract[];
}

const JobsOverview = ({ 
  contracts, 
  contractors,
  milestones,
  payments, 
  onViewJob 
}: JobsOverviewProps) => {
  // Group contracts by name (assuming contracts with the same name are part of the same job)
  const [expandedJobs, setExpandedJobs] = useState<string[]>([]);
  
  // Group contracts that might be related to the same job
  // For the purpose of this demo, we're grouping by the first word in the contract name
  const groupedContracts: GroupedContracts = contracts.reduce((groups: GroupedContracts, contract) => {
    // Extract job name (first word before a dash, hyphen or colon)
    const jobName = contract.contractName.split(/[-:]/)[0].trim();
    
    if (!groups[jobName]) {
      groups[jobName] = [];
    }
    
    groups[jobName].push(contract);
    return groups;
  }, {});
  
  const getContractorById = (id: number) => {
    return contractors.find(contractor => contractor.id === id);
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'active':
        return 'bg-green-900 text-green-400';
      case 'pending_approval':
        return 'bg-amber-900 text-amber-400';
      case 'completed':
        return 'bg-blue-900 text-blue-400';
      case 'terminated':
        return 'bg-red-900 text-red-400';
      default:
        return 'bg-zinc-800 text-gray-400';
    }
  };
  
  const formatStatus = (status: string) => {
    switch(status) {
      case 'pending_approval':
        return 'Pending Approval';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  const toggleJobExpand = (jobName: string) => {
    if (expandedJobs.includes(jobName)) {
      setExpandedJobs(expandedJobs.filter(name => name !== jobName));
    } else {
      setExpandedJobs([...expandedJobs, jobName]);
    }
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const calculateJobProgress = (contracts: Contract[]) => {
    const activeContracts = contracts.filter(c => c.status === 'active' || c.status === 'completed');
    const completedContracts = contracts.filter(c => c.status === 'completed');
    
    if (activeContracts.length === 0) return 0;
    return Math.round((completedContracts.length / activeContracts.length) * 100);
  };
  
  const calculateTotalValue = (contracts: Contract[]) => {
    return contracts.reduce((sum, contract) => sum + Number(contract.value), 0);
  };
  
  return (
    <Card className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
      <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">All Jobs</h3>
        <Button
          variant="outline"
          size="sm"
          className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
        >
          <PlusCircle className="mr-1" size={14} />
          Create New Job
        </Button>
      </div>
      
      <div className="divide-y divide-zinc-800">
        {Object.keys(groupedContracts).length > 0 ? (
          Object.entries(groupedContracts).map(([jobName, jobContracts]) => {
            const isExpanded = expandedJobs.includes(jobName);
            const jobProgress = calculateJobProgress(jobContracts);
            const totalValue = calculateTotalValue(jobContracts);
            const contractorsCount = new Set(jobContracts.map(c => c.contractorId)).size;
            const earliestStartDate = jobContracts
              .map(c => c.startDate)
              .filter(Boolean)
              .sort((a, b) => new Date(a as Date).getTime() - new Date(b as Date).getTime())[0];
            
            // For workflow visualization - determine job stage based on progress and contract statuses
            const activeContracts = jobContracts.filter(c => c.status === 'active').length;
            const completedContracts = jobContracts.filter(c => c.status === 'completed').length;
            const pendingContracts = jobContracts.filter(c => c.status === 'pending_approval').length;
            
            let jobStage = 'planning';
            if (completedContracts > 0) {
              jobStage = 'completion';
            } else if (activeContracts > 0) {
              jobStage = 'in_progress';
            } else if (pendingContracts > 0) {
              jobStage = 'contract_approval';
            }
            
            return (
              <div key={jobName} className="overflow-hidden">
                <div 
                  className="p-4 hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleJobExpand(jobName)}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-md bg-zinc-800 text-accent-500 flex items-center justify-center">
                      <Briefcase size={20} />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-md font-medium text-white flex items-center">
                        {jobName}
                        <Badge className="ml-2 bg-zinc-800 text-gray-400 text-xs">
                          {jobContracts.length} contract{jobContracts.length !== 1 ? 's' : ''}
                        </Badge>
                      </h3>
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        <span className="flex items-center mr-3">
                          <Users size={12} className="mr-1" />
                          {contractorsCount} contractor{contractorsCount !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center mr-3">
                          <DollarSign size={12} className="mr-1" />
                          ${totalValue.toLocaleString('en-US')} budget
                        </span>
                        {earliestStartDate && (
                          <span className="flex items-center">
                            <Calendar size={12} className="mr-1" />
                            Started {formatDate(earliestStartDate as Date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-4">
                      <div className="flex items-center text-xs text-gray-400 mb-1 justify-between">
                        <span>Overall Progress</span>
                        <span className="ml-2">{jobProgress}%</span>
                      </div>
                      <Progress value={jobProgress} className="h-1.5 w-32 bg-zinc-800" indicatorClassName="bg-accent-500" />
                    </div>
                    <div>
                      {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="bg-zinc-900 px-4 pb-4">
                    {/* Workflow Stage Visualization */}
                    <div className="ml-14 mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Job Stage:</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className={`flex flex-col items-center ${jobStage === 'planning' ? 'text-accent-500' : 'text-gray-500'}`}>
                          <div className={`h-8 w-8 rounded-full ${jobStage === 'planning' ? 'bg-accent-900 text-accent-500' : 'bg-zinc-800 text-gray-500'} flex items-center justify-center mb-1`}>
                            <Briefcase size={16} />
                          </div>
                          <span className="text-[10px]">Planning</span>
                        </div>
                        <div className={`flex flex-col items-center ${jobStage === 'contract_approval' ? 'text-amber-500' : 'text-gray-500'}`}>
                          <div className={`h-8 w-8 rounded-full ${jobStage === 'contract_approval' ? 'bg-amber-900 text-amber-500' : 'bg-zinc-800 text-gray-500'} flex items-center justify-center mb-1`}>
                            <FileText size={16} />
                          </div>
                          <span className="text-[10px]">Contract</span>
                        </div>
                        <div className={`flex flex-col items-center ${jobStage === 'in_progress' ? 'text-blue-500' : 'text-gray-500'}`}>
                          <div className={`h-8 w-8 rounded-full ${jobStage === 'in_progress' ? 'bg-blue-900 text-blue-500' : 'bg-zinc-800 text-gray-500'} flex items-center justify-center mb-1`}>
                            <Clock size={16} />
                          </div>
                          <span className="text-[10px]">In Progress</span>
                        </div>
                        <div className={`flex flex-col items-center ${jobStage === 'completion' ? 'text-green-500' : 'text-gray-500'}`}>
                          <div className={`h-8 w-8 rounded-full ${jobStage === 'completion' ? 'bg-green-900 text-green-500' : 'bg-zinc-800 text-gray-500'} flex items-center justify-center mb-1`}>
                            <CheckCircle size={16} />
                          </div>
                          <span className="text-[10px]">Completion</span>
                        </div>
                      </div>
                      
                      {/* Progress Line */}
                      <div className="relative h-1 bg-zinc-800 my-2 mx-4">
                        <div 
                          className="absolute top-0 left-0 h-1 bg-accent-500" 
                          style={{ 
                            width: jobStage === 'planning' ? '10%' : 
                                  jobStage === 'contract_approval' ? '35%' : 
                                  jobStage === 'in_progress' ? '65%' : '100%' 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="ml-14">
                      <Tabs defaultValue="contracts" className="w-full">
                        <TabsList className="bg-zinc-800 mb-4">
                          <TabsTrigger value="contracts" className="data-[state=active]:bg-zinc-700">Smart Contracts</TabsTrigger>
                          <TabsTrigger value="milestones" className="data-[state=active]:bg-zinc-700">Milestones</TabsTrigger>
                          <TabsTrigger value="payments" className="data-[state=active]:bg-zinc-700">Payments</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="contracts" className="mt-0">
                          <div className="space-y-3">
                            {jobContracts.map(contract => {
                              const contractor = getContractorById(contract.contractorId);
                              
                              return (
                                <div key={contract.id} className="p-3 rounded-md border border-zinc-800 hover:border-zinc-700">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-sm font-medium text-white">{contract.contractName}</h4>
                                      <p className="text-xs text-gray-400 mt-1">
                                        <span className="flex items-center">
                                          <Users size={12} className="mr-1" />
                                          {contractor?.firstName} {contractor?.lastName} • {contract.contractCode}
                                        </span>
                                      </p>
                                    </div>
                                    <Badge className={`${getStatusBadgeClass(contract.status)}`}>
                                      {formatStatus(contract.status)}
                                    </Badge>
                                  </div>
                                  
                                  <div className="mt-2 flex flex-wrap items-center gap-y-1 text-xs text-gray-400">
                                    <span className="flex items-center mr-3">
                                      <DollarSign size={12} className="mr-1" />
                                      ${parseFloat(contract.value.toString()).toLocaleString('en-US')}
                                    </span>
                                    {contract.startDate && (
                                      <span className="flex items-center mr-3">
                                        <Calendar size={12} className="mr-1" />
                                        Start: {formatDate(contract.startDate)}
                                      </span>
                                    )}
                                    {contract.endDate && (
                                      <span className="flex items-center">
                                        <Clock size={12} className="mr-1" />
                                        Due: {formatDate(contract.endDate)}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="mt-3 flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                      onClick={() => onViewJob && onViewJob(contract.id)}
                                    >
                                      View Contract
                                    </Button>
                                    
                                    {contract.status === 'active' && (
                                      <Button
                                        size="sm"
                                        className="text-xs bg-accent-500 hover:bg-accent-600 text-white"
                                      >
                                        <CheckCircle size={12} className="mr-1" />
                                        Approve Work
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            
                            <div className="mt-2 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                              >
                                <PlusCircle size={14} className="mr-1" />
                                Add Contract
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="milestones" className="mt-0">
                          <div className="space-y-3">
                            {/* Filter milestones for this job's contracts */}
                            {milestones
                              .filter(milestone => jobContracts.some(contract => contract.id === milestone.contractId))
                              .map(milestone => {
                                const contract = jobContracts.find(c => c.id === milestone.contractId);
                                const contractor = contract ? getContractorById(contract.contractorId) : null;
                                
                                return (
                                  <div key={milestone.id} className="p-3 rounded-md border border-zinc-800 hover:border-zinc-700">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="text-sm font-medium text-white">{milestone.name}</h4>
                                        <p className="text-xs text-gray-400 mt-1">
                                          <span className="flex items-center">
                                            <Users size={12} className="mr-1" />
                                            {contractor?.firstName} {contractor?.lastName} • {contract?.contractName}
                                          </span>
                                        </p>
                                      </div>
                                      <Badge className={`${getStatusBadgeClass(milestone.status)}`}>
                                        {formatStatus(milestone.status)}
                                      </Badge>
                                    </div>
                                    
                                    <div className="mt-2 flex flex-wrap items-center gap-y-1 text-xs text-gray-400">
                                      <span className="flex items-center mr-3">
                                        <DollarSign size={12} className="mr-1" />
                                        ${parseFloat(milestone.paymentAmount.toString()).toLocaleString('en-US')}
                                      </span>
                                      {milestone.dueDate && (
                                        <span className="flex items-center">
                                          <Clock size={12} className="mr-1" />
                                          Due: {formatDate(milestone.dueDate as Date)}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="mt-2">
                                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                          className="bg-accent-500 h-1.5" 
                                          style={{ width: `${milestone.progress || 0}%` }}
                                        ></div>
                                      </div>
                                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                                        <span>Progress</span>
                                        <span>{milestone.progress || 0}%</span>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-3 flex gap-2">
                                      {milestone.status === 'pending_approval' && (
                                        <Button
                                          size="sm"
                                          className="text-xs bg-accent-500 hover:bg-accent-600 text-white"
                                        >
                                          <CheckCircle size={12} className="mr-1" />
                                          Approve
                                        </Button>
                                      )}
                                      
                                      {milestone.status === 'in_progress' && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                        >
                                          <AlertCircle size={12} className="mr-1" />
                                          Request Update
                                        </Button>
                                      )}
                                      
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                      >
                                        View Details
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            
                            {milestones.filter(milestone => jobContracts.some(contract => contract.id === milestone.contractId)).length === 0 && (
                              <div className="text-center py-4 text-gray-400 text-sm">
                                No milestones found for this job
                              </div>
                            )}
                            
                            <div className="mt-2 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                              >
                                <PlusCircle size={14} className="mr-1" />
                                Add Milestone
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="payments" className="mt-0">
                          <div className="space-y-3">
                            {/* Filter payments for this job's contracts */}
                            {payments
                              .filter(payment => jobContracts.some(contract => contract.id === payment.contractId))
                              .map(payment => {
                                const contract = jobContracts.find(c => c.id === payment.contractId);
                                const contractor = contract ? getContractorById(contract.contractorId) : null;
                                
                                return (
                                  <div key={payment.id} className="p-3 rounded-md border border-zinc-800 hover:border-zinc-700">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="text-sm font-medium text-white">{payment.notes || `Payment #${payment.id}`}</h4>
                                        <p className="text-xs text-gray-400 mt-1">
                                          <span className="flex items-center">
                                            <Users size={12} className="mr-1" />
                                            {contractor?.firstName} {contractor?.lastName} • {contract?.contractName}
                                          </span>
                                        </p>
                                      </div>
                                      <Badge className={payment.status === 'pending' ? 'bg-amber-900 text-amber-400' : 'bg-green-900 text-green-400'}>
                                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                      </Badge>
                                    </div>
                                    
                                    <div className="mt-2 flex flex-wrap items-center gap-y-1 text-xs text-gray-400">
                                      <span className="flex items-center mr-3">
                                        <DollarSign size={12} className="mr-1" />
                                        ${parseFloat(payment.amount.toString()).toLocaleString('en-US')}
                                      </span>
                                      {payment.scheduledDate && (
                                        <span className="flex items-center mr-3">
                                          <Clock size={12} className="mr-1" />
                                          Scheduled: {formatDate(payment.scheduledDate as Date)}
                                        </span>
                                      )}
                                      {payment.completedDate && (
                                        <span className="flex items-center">
                                          <CheckCircle size={12} className="mr-1" />
                                          Paid: {formatDate(payment.completedDate as Date)}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="mt-3 flex gap-2">
                                      {payment.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          className="text-xs bg-accent-500 hover:bg-accent-600 text-white"
                                        >
                                          <Coins size={12} className="mr-1" />
                                          Process Payment
                                        </Button>
                                      )}
                                      
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                      >
                                        View Details
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {payments.filter(payment => jobContracts.some(contract => contract.id === payment.contractId)).length === 0 && (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                  No payments found for this job
                                </div>
                              )}
                              
                              <div className="mt-2 flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                >
                                  <PlusCircle size={14} className="mr-1" />
                                  Schedule Payment
                                </Button>
                              </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                      
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                          onClick={() => {}} // Navigate to detailed job view
                        >
                          View Job Details
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-gray-400">
            No jobs found
          </div>
        )}
      </div>
    </Card>
  );
};

export default JobsOverview;