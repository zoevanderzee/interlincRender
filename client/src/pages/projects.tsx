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
        <div className="h-12 bg-primary-100 rounded w-1/3"></div>
        <div className="h-10 bg-primary-100 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-primary-100 rounded"></div>
          <div className="h-32 bg-primary-100 rounded"></div>
          <div className="h-32 bg-primary-100 rounded"></div>
        </div>
        <div className="h-64 bg-primary-100 rounded"></div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Projects & Milestones</h1>
          <p className="text-primary-500 mt-1">Track project milestones and deliverables</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => navigate("/contracts/new")}>
            <Plus size={16} className="mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border border-primary-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-accent-50 flex items-center justify-center text-accent-500">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-primary-500 text-sm">Upcoming Milestones</p>
              <h3 className="text-2xl font-semibold text-primary-900">{milestones.filter(m => m.status === 'pending').length}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-primary-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-success-50 flex items-center justify-center text-success">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-primary-500 text-sm">Completed Milestones</p>
              <h3 className="text-2xl font-semibold text-primary-900">{milestones.filter(m => m.status === 'completed' || m.status === 'approved').length}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-primary-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-warning-50 flex items-center justify-center text-warning">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-primary-500 text-sm">Overdue Milestones</p>
              <h3 className="text-2xl font-semibold text-primary-900">{milestones.filter(m => m.status === 'overdue').length}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" size={18} />
            <Input
              placeholder="Search milestones..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
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

      {/* Milestones List */}
      <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-primary-100 flex justify-between items-center">
          <h2 className="text-lg font-medium text-primary-900">Project Milestones</h2>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>

        {filteredMilestones.length > 0 ? (
          <MilestonesList
            milestones={filteredMilestones}
            contracts={contracts}
            contractors={contractors}
            onViewDetails={handleViewMilestone}
            onApprove={handleApproveMilestone}
            onRequestUpdate={handleRequestUpdate}
          />
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-4">
              <Calendar size={24} />
            </div>
            <h3 className="text-lg font-medium text-primary-900 mb-2">No milestones found</h3>
            <p className="text-primary-500 mb-6">
              {searchTerm || statusFilter !== "all" ? 
                "No milestones match your current filters." : 
                "There are no milestones to display."}
            </p>
            {searchTerm || statusFilter !== "all" ? (
              <Button variant="outline" onClick={clearFilters}>
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

      {/* Active Projects */}
      <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
        <div className="p-4 border-b border-primary-100">
          <h2 className="text-lg font-medium text-primary-900">Active Projects</h2>
        </div>

        {contracts.filter(c => c.status === 'active').length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Next Milestone</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts
                  .filter(c => c.status === 'active')
                  .map(contract => {
                    const contractor = contractors.find(c => c.id === contract.contractorId);
                    return (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="h-8 w-8 mr-3 bg-accent-100 text-accent-700 rounded-md flex items-center justify-center">
                              <FileText size={16} />
                            </div>
                            {contract.contractName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contractor?.firstName} {contractor?.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-primary-100 rounded-full h-2 max-w-[100px]">
                            <div className="bg-accent-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                          </div>
                          <span className="text-xs text-primary-500 mt-1">50%</span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning">
                            Due in 3 days
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(contract.endDate!).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/contracts/${contract.id}`)}
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
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-medium text-primary-900 mb-2">No active projects</h3>
            <p className="text-primary-500 mb-6">
              You don't have any active projects at the moment.
            </p>
            <Button onClick={() => navigate("/contracts/new")}>
              <Plus size={16} className="mr-2" />
              Create New Project
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default Projects;
