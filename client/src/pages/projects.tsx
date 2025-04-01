import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Milestone, Contract, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Plus, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle, 
  AlertCircle,
  Clock,
  FileText,
  ChevronRight
} from "lucide-react";
import MilestonesList from "@/components/dashboard/MilestonesList";

const Projects = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch milestones
  const { data: milestones = [], isLoading: isLoadingMilestones } = useQuery<Milestone[]>({
    queryKey: ['/api/milestones'],
  });

  // Fetch contracts
  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });

  // Fetch contractors
  const { data: contractors = [], isLoading: isLoadingContractors } = useQuery<User[]>({
    queryKey: ['/api/users', { role: 'contractor' }],
  });

  // Filter milestones by search term and status
  const filteredMilestones = milestones.filter((milestone) => {
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
    toast({
      title: "View Milestone",
      description: `Viewing milestone details for ID: ${id}`,
    });
  };

  // Handle approve milestone
  const handleApproveMilestone = (id: number) => {
    toast({
      title: "Milestone Approved",
      description: "The milestone has been approved and payment scheduled.",
    });
  };

  // Handle request update
  const handleRequestUpdate = (id: number) => {
    toast({
      title: "Update Requested",
      description: "A request for update has been sent to the contractor.",
    });
  };

  // Show loading state
  if (isLoadingMilestones || isLoadingContracts || isLoadingContractors) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-zinc-800 rounded w-1/3"></div>
        <div className="h-10 bg-zinc-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-zinc-800 rounded"></div>
          <div className="h-32 bg-zinc-800 rounded"></div>
          <div className="h-32 bg-zinc-800 rounded"></div>
        </div>
        <div className="h-64 bg-zinc-800 rounded"></div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Projects & Milestones</h1>
          <p className="text-zinc-400 mt-1">Track project milestones and deliverables</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => navigate("/contracts/new")}>
            <Plus size={16} className="mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border border-zinc-800 bg-black">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-amber-400">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Pending Payments</p>
              <h3 className="text-2xl font-semibold text-white">$12,500</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-zinc-800 bg-black">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-blue-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Scheduled Payments</p>
              <h3 className="text-2xl font-semibold text-white">$24,750</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-zinc-800 bg-black">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-green-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Paid Amount</p>
              <h3 className="text-2xl font-semibold text-white">$86,320</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-black p-4 rounded-lg shadow-sm border border-zinc-800 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
            <Input
              placeholder="Search projects..."
              className="pl-9 bg-zinc-900 border-zinc-700 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-black rounded-lg shadow-sm border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">Projects</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="border-zinc-700 text-white hover:text-white hover:bg-zinc-800"
          >
            Clear Filters
          </Button>
        </div>

        {contracts.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-800">
                  <TableRow>
                    <TableHead className="text-zinc-400">Project Name</TableHead>
                    <TableHead className="text-zinc-400">Progress</TableHead>
                    <TableHead className="text-zinc-400">End Date</TableHead>
                    <TableHead className="text-right text-zinc-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts
                    .filter(c => statusFilter === 'all' || c.status === statusFilter)
                    .filter(c => !searchTerm || c.contractName.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(contract => {
                      const projectMilestones = milestones.filter(m => m.contractId === contract.id);
                      const completedMilestones = projectMilestones.filter(m => m.status === 'completed' || m.status === 'approved').length;
                      const progress = projectMilestones.length > 0 
                        ? Math.round((completedMilestones / projectMilestones.length) * 100) 
                        : 0;
                      
                      // Count the number of contractors assigned to this project
                      const projectContractors = Array.from(new Set(milestones
                        .filter(m => m.contractId === contract.id)
                        .map(m => m.contractorId)
                      ));
                      
                      return (
                        <TableRow key={contract.id} className="hover:bg-zinc-800 border-b border-zinc-800">
                          <TableCell className="font-medium text-white">
                            <div className="flex items-center">
                              <div className="h-8 w-8 mr-3 bg-zinc-800 text-accent-500 rounded-md flex items-center justify-center">
                                <FileText size={16} />
                              </div>
                              <div>
                                {contract.contractName}
                                <div className="text-xs text-zinc-400 mt-1">
                                  {projectContractors.length} {projectContractors.length === 1 ? 'contractor' : 'contractors'} assigned
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-full bg-zinc-800 rounded-full h-2 max-w-[100px]">
                              <div className="bg-accent-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-xs text-zinc-400 mt-1">{progress}%</span>
                          </TableCell>
                          <TableCell className="text-white">
                            {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Not set'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-zinc-700"
                              onClick={() => navigate(`/contract/${contract.id}`)}
                            >
                              View 
                              <ChevronRight size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            
            {/* Milestones section below projects table */}
            {filteredMilestones.length > 0 && (
              <div className="border-t border-zinc-800">
                <div className="p-4 border-b border-zinc-800">
                  <h3 className="text-md font-medium text-white">Project Milestones</h3>
                </div>
                <MilestonesList
                  milestones={filteredMilestones}
                  contracts={contracts}
                  contractors={contractors}
                  onViewDetails={handleViewMilestone}
                  onApprove={handleApproveMilestone}
                  onRequestUpdate={handleRequestUpdate}
                />
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-zinc-400 mb-6">
              {searchTerm || statusFilter !== "all" ? 
                "No projects match your current filters." : 
                "You don't have any projects at the moment."}
            </p>
            {searchTerm || statusFilter !== "all" ? (
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => navigate("/contracts/new")}>
                <Plus size={16} className="mr-2" />
                Create New Project
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Projects;
