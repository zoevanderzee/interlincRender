import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ContractsTable from "@/components/dashboard/ContractsTable";
import { Plus, Search, FilterX } from "lucide-react";
import { Contract, User } from "@shared/schema";

// Define interface for dashboard data (matches server/routes.ts dashboard endpoint)
interface DashboardData {
  stats: {
    activeContractsCount: number;
    pendingApprovalsCount: number;
    paymentsProcessed: number;
    totalPendingValue: number;
    activeContractorsCount: number;
    pendingInvitesCount: number;
  };
  contracts: Contract[];
  contractors: User[];
  milestones: any[];
  payments: any[];
  invites: any[];
}
import { useAuth } from "@/hooks/use-auth";

const Contracts = () => {
  const [_, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user } = useAuth();
  const isContractor = user?.role === 'contractor';

  // Block contractors from accessing this page entirely
  if (isContractor) {
    navigate('/work-requests');
    return null;
  }

  // Use dashboard data for contracts with fallback authentication
  const { data: dashboardData, isLoading: isLoadingContracts } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    queryFn: async () => {
      const headers: HeadersInit = {
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      };
      
      // Add user ID from localStorage as fallback
      const storedUser = localStorage.getItem('interlinc_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            headers['X-User-ID'] = parsedUser.id.toString();
          }
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      }
      
      const res = await fetch("/api/dashboard", {
        method: "GET",
        credentials: "include",
        headers
      });
      
      if (!res.ok) {
        throw new Error("Could not load dashboard data");
      }
      
      return await res.json();
    },
    enabled: !!user,
  });
  
  const contracts = dashboardData?.contracts || [];

  // Get contractors from dashboard data (they're already there)
  const contractors = dashboardData?.contractors || [];
  const isLoadingContractors = isLoadingContracts;

  // Filter contracts by search term and status
  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = searchTerm === "" || 
      contract.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  // Handle view contract - contractors get read-only view
  const handleViewContract = (id: number) => {
    if (isContractor) {
      // Contractors shouldn't access full contract details
      return;
    }
    navigate(`/contract/${id}`);
  };

  // Handle edit contract
  const handleEditContract = (id: number) => {
    navigate(`/contracts/${id}/edit`);
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            {isContractor ? "My Assignments" : "Projects"}
          </h1>
          {isContractor ? (
            <p className="text-zinc-400 mt-1">View your work assignments and earnings</p>
          ) : (
            <p className="text-zinc-400 mt-1">Manage and track all your project agreements</p>
          )}
        </div>
        {!isContractor && (
          <div className="mt-4 md:mt-0">
            <Link href="/contracts/new">
              <Button className="w-full md:w-auto">
                <Plus size={16} className="mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        )}
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={clearFilters} className="md:self-start border-zinc-700 text-white hover:text-white hover:bg-zinc-800">
            <FilterX size={18} />
          </Button>
        </div>
      </div>

      {/* Contracts Table */}
      {isLoadingContracts || isLoadingContractors ? (
        <div className="bg-black rounded-lg shadow-sm border border-zinc-800 p-8">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
            <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
            <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
            <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
          </div>
        </div>
      ) : (
        <ContractsTable
          contracts={filteredContracts}
          contractors={contractors}
          onViewContract={handleViewContract}
          onEditContract={isContractor ? undefined : handleEditContract}
          isContractor={isContractor}
        />
      )}

      {/* Empty State */}
      {filteredContracts.length === 0 && !isLoadingContracts && (
        <div className="bg-black text-white rounded-lg shadow-sm border border-zinc-800 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
          <p className="text-zinc-400 mb-6">
            {searchTerm || statusFilter ? 
              "No projects match your search criteria. Try changing your filters." : 
              isContractor ? 
                "You haven't been assigned to any projects yet." : 
                "Get started by creating your first project."
            }
          </p>
          {searchTerm || statusFilter ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : !isContractor ? (
            <Link href="/contracts/new">
              <Button>
                <Plus size={16} className="mr-2" />
                Create Project
              </Button>
            </Link>
          ) : null}
        </div>
      )}
    </>
  );
};

export default Contracts;
