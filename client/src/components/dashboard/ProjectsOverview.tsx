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
  AlertCircle,
  Search,
  Filter
} from "lucide-react";
import { Contract, User, Milestone, Payment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ProjectsOverviewProps {
  contracts: Contract[];
  contractors: User[];
  milestones: Milestone[];
  payments: Payment[];
  onViewProject?: (id: number) => void;
}

interface GroupedContracts {
  [key: string]: Contract[];
}

const ProjectsOverview = ({ 
  contracts, 
  contractors,
  milestones,
  payments, 
  onViewProject 
}: ProjectsOverviewProps) => {
  // Group contracts by name (assuming contracts with the same name are part of the same project)
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Filter contracts based on search and status filter
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchTerm === '' || 
      contract.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contract.description && contract.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Group contracts that might be related to the same project
  // For the purpose of this demo, we're grouping by the first word in the contract name
  const groupedContracts: GroupedContracts = filteredContracts.reduce((groups: GroupedContracts, contract) => {
    // Extract project name (first word before a dash, hyphen or colon)
    const projectName = contract.contractName.split(/[-:]/)[0].trim();
    
    if (!groups[projectName]) {
      groups[projectName] = [];
    }
    
    groups[projectName].push(contract);
    return groups;
  }, {});
  
  const getContractorById = (id: number) => {
    return contractors.find(contractor => contractor.id === id);
  };
  
  const getContractMilestones = (contractId: number) => {
    return milestones.filter(milestone => milestone.contractId === contractId);
  };
  
  const getContractPayments = (contractId: number) => {
    return payments.filter(payment => payment.contractId === contractId);
  };
  
  const getContractorForPayment = (payment: Payment) => {
    const contract = contracts.find(c => c.id === payment.contractId);
    return contract ? getContractorById(contract.contractorId) : undefined;
  };
  
  const toggleProjectExpansion = (projectName: string) => {
    setExpandedProjects(prev => 
      prev.includes(projectName) 
        ? prev.filter(name => name !== projectName) 
        : [...prev, projectName]
    );
  };
  
  const calculateProgress = (contractStatus: string) => {
    switch(contractStatus) {
      case 'draft':
        return 10;
      case 'pending_approval':
        return 25;
      case 'active':
        return 50;
      case 'completed':
        return 100;
      case 'terminated':
        return 100;
      default:
        return 0;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'draft':
        return <Badge variant="outline" className="bg-zinc-800 text-gray-300 border-zinc-700">Draft</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-amber-900 text-amber-300 border-amber-700">Pending Approval</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-900 text-green-300 border-green-700">Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-900 text-blue-300 border-blue-700">Completed</Badge>;
      case 'terminated':
        return <Badge variant="outline" className="bg-red-900 text-red-300 border-red-700">Terminated</Badge>;
      default:
        return <Badge variant="outline" className="bg-zinc-800 text-gray-300 border-zinc-700">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-500" />
            Projects Overview
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            className="mt-2 md:mt-0 text-white border-zinc-700 hover:bg-zinc-800"
            onClick={() => {}}
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            Create New Project
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search projects and contracts..."
              className="pl-8 bg-zinc-800 border-zinc-700 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              >
                <Filter className="mr-2 h-4 w-4" />
                {statusFilter === 'all' ? 'All Statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('_', ' ')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-800 border-zinc-700 text-white">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuItem 
                className={statusFilter === 'all' ? 'bg-zinc-700' : 'hover:bg-zinc-700'}
                onClick={() => setStatusFilter('all')}
              >
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={statusFilter === 'active' ? 'bg-zinc-700' : 'hover:bg-zinc-700'}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={statusFilter === 'pending_approval' ? 'bg-zinc-700' : 'hover:bg-zinc-700'}
                onClick={() => setStatusFilter('pending_approval')}
              >
                Pending Approval
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={statusFilter === 'completed' ? 'bg-zinc-700' : 'hover:bg-zinc-700'}
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={statusFilter === 'draft' ? 'bg-zinc-700' : 'hover:bg-zinc-700'}
                onClick={() => setStatusFilter('draft')}
              >
                Draft
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={statusFilter === 'terminated' ? 'bg-zinc-700' : 'hover:bg-zinc-700'}
                onClick={() => setStatusFilter('terminated')}
              >
                Terminated
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="divide-y divide-zinc-800">
        {Object.keys(groupedContracts).length > 0 ? (
          Object.entries(groupedContracts).map(([projectName, projectContracts]) => {
            const isExpanded = expandedProjects.includes(projectName);
            const mainContract = projectContracts[0]; // Use the first contract as the main one for display
            const contractor = getContractorById(mainContract.contractorId);
            
            return (
              <div key={projectName} className="group">
                <div 
                  className="p-4 hover:bg-zinc-800 cursor-pointer flex items-center"
                  onClick={() => toggleProjectExpansion(projectName)}
                >
                  <div className="mr-2">
                    {isExpanded ? 
                      <ChevronDown className="h-5 w-5 text-gray-500" /> : 
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    }
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-md font-medium text-white">{projectName}</h3>
                      <div className="ml-2">
                        {getStatusBadge(mainContract.status)}
                      </div>
                      <div className="ml-auto flex items-center text-sm text-gray-400">
                        <span className="flex items-center mr-4">
                          <FileText className="h-4 w-4 mr-1 text-gray-500" />
                          {projectContracts.length} {projectContracts.length === 1 ? 'Contract' : 'Contracts'}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                          {formatCurrency(projectContracts.reduce((sum, contract) => sum + Number(contract.value), 0))}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center text-sm">
                      <div className="flex items-center text-gray-400 mr-4">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        {contractor?.firstName} {contractor?.lastName}
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Clock className="h-4 w-4 mr-1 text-gray-500" />
                        Started {mainContract.startDate ? new Date(mainContract.startDate).toLocaleDateString() : 'Not specified'}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <Progress value={calculateProgress(mainContract.status)} className="h-1.5" />
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="px-4 py-3 bg-zinc-800/50">
                    <Tabs defaultValue="contracts" className="w-full">
                      <TabsList className="bg-zinc-900 border-b border-zinc-700 rounded-none w-full justify-start mb-4">
                        <TabsTrigger value="contracts" className="text-sm data-[state=active]:bg-zinc-800">
                          Contracts
                        </TabsTrigger>
                        <TabsTrigger value="milestones" className="text-sm data-[state=active]:bg-zinc-800">
                          Milestones
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="text-sm data-[state=active]:bg-zinc-800">
                          Payments
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="contracts" className="space-y-4 mt-0">
                        <div className="space-y-2">
                          {projectContracts.map(contract => {
                            const contractor = getContractorById(contract.contractorId);
                            return (
                              <div key={contract.id} className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 bg-zinc-800 rounded-md flex items-center justify-center text-indigo-500">
                                      <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="ml-3">
                                      <h4 className="text-sm font-medium text-white">{contract.contractName}</h4>
                                      <p className="text-xs text-gray-400">Code: {contract.contractCode}</p>
                                    </div>
                                  </div>
                                  <div>
                                    {getStatusBadge(contract.status)}
                                  </div>
                                </div>
                                
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  <div className="flex items-center text-gray-400">
                                    <Users className="h-4 w-4 mr-1 text-gray-500" />
                                    {contractor?.firstName} {contractor?.lastName}
                                  </div>
                                  <div className="flex items-center text-gray-400">
                                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                                    {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'Not set'} - {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Not set'}
                                  </div>
                                  <div className="flex items-center text-gray-400">
                                    <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                                    {formatCurrency(Number(contract.value))}
                                  </div>
                                </div>
                                
                                <div className="mt-3 text-xs text-gray-400">
                                  {contract.description || "No description provided"}
                                </div>
                                
                                <div className="mt-3 flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                    onClick={() => onViewProject && onViewProject(contract.id)}
                                  >
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="milestones" className="space-y-4 mt-0">
                        <div className="space-y-2">
                          {projectContracts.flatMap(contract => 
                            getContractMilestones(contract.id).map(milestone => (
                              <div key={milestone.id} className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 bg-zinc-800 rounded-md flex items-center justify-center text-amber-500">
                                      <ListTodo className="h-4 w-4" />
                                    </div>
                                    <div className="ml-3">
                                      <h4 className="text-sm font-medium text-white">{milestone.name}</h4>
                                      <p className="text-xs text-gray-400">Contract: {projectContracts.find(c => c.id === milestone.contractId)?.contractName}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Badge variant="outline" className={`
                                      ${milestone.status === 'completed' ? 'bg-green-900 text-green-300 border-green-700' : 
                                        milestone.status === 'in_progress' ? 'bg-indigo-900 text-indigo-300 border-indigo-700' : 
                                        'bg-amber-900 text-amber-300 border-amber-700'}
                                    `}>
                                      {milestone.status === 'in_progress' ? 'In Progress' : milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div className="flex items-center text-gray-400">
                                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center text-gray-400">
                                    <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                                    {formatCurrency(Number(milestone.paymentAmount))}
                                  </div>
                                </div>
                                
                                <div className="mt-3 text-xs text-gray-400">
                                  {milestone.description || "No description provided"}
                                </div>
                                
                                <div className="mt-2">
                                  <Progress value={
                                    milestone.status === 'completed' ? 100 : 
                                    milestone.status === 'in_progress' ? 60 : 
                                    milestone.status === 'pending_approval' ? 80 : 0
                                  } className="h-1.5" />
                                </div>
                                
                                <div className="mt-3 flex justify-end space-x-2">
                                  {milestone.status === 'pending_approval' && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="text-xs text-white bg-green-700 hover:bg-green-800"
                                      onClick={() => {}}
                                    >
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Approve
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                    onClick={() => {}}
                                  >
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                          
                          {projectContracts.flatMap(contract => 
                            getContractMilestones(contract.id)).length === 0 && (
                              <div className="p-4 text-center text-gray-400">
                                No milestones found for this project
                              </div>
                            )
                          }
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="payments" className="space-y-4 mt-0">
                        <div className="space-y-2">
                          {projectContracts.flatMap(contract => 
                            getContractPayments(contract.id).map(payment => (
                              <div key={payment.id} className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 bg-zinc-800 rounded-md flex items-center justify-center text-emerald-500">
                                      <Coins className="h-4 w-4" />
                                    </div>
                                    <div className="ml-3">
                                      <h4 className="text-sm font-medium text-white">Payment #{payment.id}</h4>
                                      <p className="text-xs text-gray-400">Contract: {projectContracts.find(c => c.id === payment.contractId)?.contractName}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Badge variant="outline" className={`
                                      ${payment.status === 'completed' ? 'bg-green-900 text-green-300 border-green-700' : 
                                        payment.status === 'pending' ? 'bg-amber-900 text-amber-300 border-amber-700' : 
                                        'bg-red-900 text-red-300 border-red-700'}
                                    `}>
                                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  <div className="flex items-center text-gray-400">
                                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                                    Due: {new Date(payment.scheduledDate).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center text-gray-400">
                                    <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                                    {formatCurrency(Number(payment.amount))}
                                  </div>
                                  <div className="flex items-center text-gray-400">
                                    <Globe className="h-4 w-4 mr-1 text-gray-500" />
                                    Smart Contract
                                  </div>
                                </div>
                                
                                <div className="mt-3 text-xs text-gray-400">
                                  {payment.notes || "No notes provided"}
                                </div>
                                
                                <div className="mt-3 flex justify-end space-x-2">
                                  {payment.status === 'pending' && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="text-xs text-white bg-green-700 hover:bg-green-800"
                                      onClick={() => {}}
                                    >
                                      <ArrowRight className="mr-1 h-3 w-3" />
                                      Process
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                    onClick={() => {}}
                                  >
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                          
                          {projectContracts.flatMap(contract => 
                            getContractPayments(contract.id)).length === 0 && (
                              <div className="p-4 text-center text-gray-400">
                                No payments found for this project
                              </div>
                            )
                          }
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    <div className="mt-4 pt-3 border-t border-zinc-700 flex justify-between items-center">
                      <div className="text-xs text-gray-400">
                        {projectContracts.length} {projectContracts.length === 1 ? 'contract' : 'contracts'} in this project
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                        onClick={() => {}} // Navigate to detailed project view
                      >
                        View Project Details
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-gray-400">
            No projects found
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProjectsOverview;