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
  ArrowRight,
  AlertCircle,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2 // Import delete and menu icons
} from "lucide-react";
import { Contract, User, Milestone, Payment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ProjectsOverviewProps {
  contracts: Contract[];
  contractors: User[];
  milestones: Milestone[];
  payments: Payment[];
  onViewProject?: (id: number) => void;
}

const ProjectsOverview: React.FC<ProjectsOverviewProps> = ({ 
  contracts, 
  contractors, 
  milestones, 
  payments,
  onViewProject
}) => {
  const [, navigate] = useLocation();
  const [expandedProject, setExpandedProject] = useState<number | null>(contracts.length > 0 ? contracts[0].id : null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Contract | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Toggle project expansion
  const toggleProject = (id: number) => {
    setExpandedProject(expandedProject === id ? null : id);
  };

  // Get contractor name by ID
  const getContractorName = (id: number) => {
    const contractor = contractors.find(c => c.id === id);
    return contractor ? `${contractor.firstName || ''} ${contractor.lastName || ''}` : 'Unknown Contractor';
  };

  // Get contract status
  const getContractStatus = (contract: Contract) => {
    if (contract.status === 'completed') return 'Completed';
    if (contract.status === 'active') return 'Active';
    if (contract.status === 'draft') return 'Draft';
    if (contract.status === 'terminated') return 'Terminated';
    return 'Unknown';
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-500 hover:bg-green-600';
      case 'active': return 'bg-blue-500 hover:bg-blue-600';
      case 'draft': return 'bg-amber-500 hover:bg-amber-600';
      case 'terminated': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-zinc-500 hover:bg-zinc-600';
    }
  };

  // Calculate contract progress
  const calculateProgress = (contractId: number) => {
    const contractMilestones = milestones.filter(m => m.contractId === contractId);
    if (contractMilestones.length === 0) return 0;

    const completedMilestones = contractMilestones.filter(m => m.status === 'completed').length;
    return Math.round((completedMilestones / contractMilestones.length) * 100);
  };

  // Format date
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Not set";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Get contract milestones
  const getContractMilestones = (contractId: number) => {
    return milestones.filter(m => m.contractId === contractId);
  };

  // Get contract payments
  const getContractPayments = (contractId: number) => {
    return payments.filter(p => p.contractId === contractId);
  };

  // Filter projects based on search term and status
  const filteredProjects = contracts.filter(contract => {
    const matchesSearch = searchTerm === "" || 
      contract.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getContractorName(contract.contractorId).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === null || contract.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Get project details for the expanded project
  const projectContracts = expandedProject 
    ? contracts.filter(c => c.id === expandedProject)
    : [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (contractId: number) => {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': localStorage.getItem('user_id') || '',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete project');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({ title: 'Project deleted successfully' });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete project', 
        description: error.message || 'An error occurred while deleting the project',
        variant: 'destructive' 
      });
    }
  });

  // Handle delete project
  const handleDeleteProject = (contract: Contract, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the project
    setProjectToDelete(contract);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete.id);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800">
      <div className="p-4 flex flex-col md:flex-row justify-between gap-3">
        <div className="flex flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
          <Input
            className="pl-9 bg-zinc-800 border-zinc-700 text-white w-full"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white">
              <Filter className="h-4 w-4 mr-2" />
              Filter Status
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white">
            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem 
              className={`hover:bg-zinc-800 cursor-pointer ${filterStatus === null ? 'bg-zinc-800' : ''}`}
              onClick={() => setFilterStatus(null)}
            >
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={`hover:bg-zinc-800 cursor-pointer ${filterStatus === 'active' ? 'bg-zinc-800' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={`hover:bg-zinc-800 cursor-pointer ${filterStatus === 'draft' ? 'bg-zinc-800' : ''}`}
              onClick={() => setFilterStatus('draft')}
            >
              Draft
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={`hover:bg-zinc-800 cursor-pointer ${filterStatus === 'completed' ? 'bg-zinc-800' : ''}`}
              onClick={() => setFilterStatus('completed')}
            >
              Completed
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={`hover:bg-zinc-800 cursor-pointer ${filterStatus === 'terminated' ? 'bg-zinc-800' : ''}`}
              onClick={() => setFilterStatus('terminated')}
            >
              Terminated
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          onClick={() => navigate('/projects/new')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="overflow-y-auto max-h-[500px]">
        {filteredProjects.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-zinc-500 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">No projects found</h3>
            <p className="text-zinc-400">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredProjects.map(contract => {
              const isExpanded = expandedProject === contract.id;
              const progress = calculateProgress(contract.id);
              const status = getContractStatus(contract);
              const statusColor = getStatusColor(status);

              return (
                <div key={contract.id} className="text-white">
                  <div 
                    className="p-4 flex flex-col md:flex-row justify-between cursor-pointer hover:bg-zinc-800/50"
                    onClick={() => toggleProject(contract.id)}
                  >
                    <div className="flex items-center gap-3 mb-3 md:mb-0">
                      <div className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center text-blue-500">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{contract.contractName}</h3>
                        <p className="text-xs text-zinc-400">
                          <span className="mr-3">ID: {contract.id}</span>
                          <span>Contractor: {getContractorName(contract.contractorId)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden md:block">
                        <div className="flex items-center">
                          <div className="h-3 w-24 rounded-full bg-zinc-800 mr-2">
                            <div 
                              className="h-3 rounded-full bg-blue-500"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-zinc-400">{progress}%</span>
                        </div>
                      </div>

                      <Badge className={`${statusColor} text-white px-2 py-1 font-normal rounded-md`}>
                        {status}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-zinc-400 hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-white">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contract/${contract.id}`);
                            }}
                            className="hover:bg-zinc-800 cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteProject(contract, e)}
                            className="hover:bg-zinc-800 cursor-pointer text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="text-zinc-400">
                        {isExpanded ? 
                          <ChevronDown className="h-5 w-5" /> : 
                          <ChevronRight className="h-5 w-5" />
                        }
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 text-white">
                      <Tabs defaultValue="details" className="w-full">
                        <div className="border-b border-zinc-800 mb-3">
                          <TabsList className="bg-transparent border-b border-zinc-800 rounded-none p-0">
                            <TabsTrigger
                              value="details"
                              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none py-2 text-xs data-[state=active]:border-white data-[state=active]:shadow-none data-[state=active]:text-white"
                            >
                              Contract Details
                            </TabsTrigger>
                            <TabsTrigger
                              value="milestones"
                              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none py-2 text-xs data-[state=active]:border-white data-[state=active]:shadow-none data-[state=active]:text-white"
                            >
                              Milestones
                            </TabsTrigger>
                            <TabsTrigger
                              value="payments"
                              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none py-2 text-xs data-[state=active]:border-white data-[state=active]:shadow-none data-[state=active]:text-white"
                            >
                              Payments
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="details" className="mt-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
                              <div className="flex items-center mb-2">
                                <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                                <span className="text-xs font-medium text-zinc-400">Start Date</span>
                              </div>
                              <p className="text-sm">{formatDate(contract.startDate)}</p>
                            </div>

                            <div className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
                              <div className="flex items-center mb-2">
                                <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                                <span className="text-xs font-medium text-zinc-400">End Date</span>
                              </div>
                              <p className="text-sm">{formatDate(contract.endDate)}</p>
                            </div>

                            <div className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
                              <div className="flex items-center mb-2">
                                <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                                <span className="text-xs font-medium text-zinc-400">Contract Value</span>
                              </div>
                              <p className="text-sm">${Number(contract.value).toLocaleString()}</p>
                            </div>

                            <div className="p-3 bg-zinc-900 rounded-md border border-zinc-800 md:col-span-3">
                              <div className="flex items-center mb-2">
                                <FileText className="h-4 w-4 mr-2 text-yellow-500" />
                                <span className="text-xs font-medium text-zinc-400">Description</span>
                              </div>
                              <p className="text-sm">{contract.description}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                              onClick={() => onViewProject && onViewProject(contract.id)}
                            >
                              View Details
                              <ArrowRight className="ml-2 h-3 w-3" />
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="milestones" className="mt-0">
                          <div className="space-y-2">
                            {getContractMilestones(contract.id).length === 0 ? (
                              <div className="text-center py-4 text-zinc-400">
                                <p>No milestones found for this contract</p>
                              </div>
                            ) : (
                              getContractMilestones(contract.id).map(milestone => (
                                <div key={milestone.id} className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                      <div className={`h-8 w-8 rounded-md flex items-center justify-center 
                                        ${milestone.status === 'completed' ? 'bg-green-900 text-green-500' : 
                                          milestone.status === 'in_progress' ? 'bg-blue-900 text-blue-500' : 
                                          'bg-amber-900 text-amber-500'}`}>
                                        {milestone.status === 'completed' ? 
                                          <CheckCircle className="h-4 w-4" /> : 
                                          <Clock className="h-4 w-4" />
                                        }
                                      </div>
                                      <div className="ml-3">
                                        <h4 className="text-sm font-medium">{milestone.name}</h4>
                                        <p className="text-xs text-zinc-400">
                                          Due: {formatDate(milestone.dueDate)}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge className={`${
                                      milestone.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : 
                                      milestone.status === 'in_progress' ? 'bg-blue-500 hover:bg-blue-600' : 
                                      'bg-amber-500 hover:bg-amber-600'
                                    } text-white`}>
                                      {milestone.status === 'completed' ? 'Completed' : 
                                       milestone.status === 'in_progress' ? 'In Progress' : 
                                       'Pending'}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="payments" className="mt-0">
                          <div className="space-y-2">
                            {getContractPayments(contract.id).length === 0 ? (
                              <div className="text-center py-4 text-zinc-400">
                                <p>No payments found for this contract</p>
                              </div>
                            ) : (
                              getContractPayments(contract.id).map(payment => (
                                <div key={payment.id} className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                      <div className={`h-8 w-8 rounded-md flex items-center justify-center 
                                        ${payment.status === 'completed' ? 'bg-green-900 text-green-500' : 
                                          payment.status === 'pending' ? 'bg-amber-900 text-amber-500' : 
                                          'bg-red-900 text-red-500'}`}>
                                        <DollarSign className="h-4 w-4" />
                                      </div>
                                      <div className="ml-3">
                                        <h4 className="text-sm font-medium">Payment #{payment.id}</h4>
                                        <p className="text-xs text-zinc-400">
                                          {payment.notes || `Milestone: ${
                                            milestones.find(m => m.id === payment.milestoneId)?.name || 'Unknown'
                                          }`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium">${Number(payment.amount).toLocaleString()}</div>
                                      <Badge className={`${
                                        payment.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : 
                                        payment.status === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : 
                                        'bg-red-500 hover:bg-red-600'
                                      } text-white`}>
                                        {payment.status === 'completed' ? 'Paid' : 
                                         payment.status === 'pending' ? 'Pending' : 
                                         'Failed'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{projectToDelete?.contractName}"? This action cannot be undone and will remove all associated milestones and payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ProjectsOverview;