import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Eye, 
  Edit, 
  MoreVertical, 
  Search, 
  Filter,
  ChevronDown 
} from "lucide-react";
import { Contract, User } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface ContractsTableProps {
  contracts: Contract[];
  contractors: User[];
  onViewContract?: (id: number) => void;
  onEditContract?: (id: number) => void;
}

const ContractsTable = ({ 
  contracts, 
  contractors,
  onViewContract,
  onEditContract
}: ContractsTableProps) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
  
  // Filter contracts based on search term and status filter
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchTerm === '' || 
      contract.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contract.description && contract.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex flex-col md:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search contracts..."
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
                {statusFilter === 'all' ? 'All Statuses' : formatStatus(statusFilter)}
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
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-zinc-800">
            <TableRow>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contract Name</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contractor</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Next Milestone</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Value</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContracts.map((contract) => {
              const contractor = getContractorById(contract.contractorId);
              
              return (
                <TableRow key={contract.id} className="hover:bg-zinc-800 border-b border-zinc-800">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-zinc-800 text-accent-500 rounded-md flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{contract.contractName}</div>
                        <div className="text-xs text-gray-400">{contract.contractCode}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-white">{contractor?.firstName} {contractor?.lastName}</div>
                        <div className="text-xs text-gray-400">{contractor?.title}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(contract.status)}`}>
                      {formatStatus(contract.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">Final Design Delivery</div>
                    <div className="text-xs text-gray-400">Due in 4 days</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    ${parseFloat(contract.value.toString()).toLocaleString('en-US')}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        className="text-accent-500 hover:text-accent-600" 
                        title="View Details"
                        onClick={() => onViewContract && onViewContract(contract.id)}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="text-white hover:text-gray-300" 
                        title="Edit Contract"
                        onClick={() => onEditContract && onEditContract(contract.id)}
                      >
                        <Edit size={16} />
                      </button>
                      <button className="text-white hover:text-gray-300" title="More Options">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {filteredContracts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-400">
                  {contracts.length === 0 ? "No contracts found" : "No contracts match the current filters"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ContractsTable;
