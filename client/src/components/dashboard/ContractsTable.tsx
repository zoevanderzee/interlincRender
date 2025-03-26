import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Eye, Edit, MoreVertical } from "lucide-react";
import { Contract, User } from "@shared/schema";

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
  const getContractorById = (id: number) => {
    return contractors.find(contractor => contractor.id === id);
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'active':
        return 'bg-success-100 text-success';
      case 'pending_approval':
        return 'bg-warning-100 text-warning';
      case 'completed':
        return 'bg-primary-100 text-primary-700';
      case 'terminated':
        return 'bg-destructive-100 text-destructive';
      default:
        return 'bg-primary-100 text-primary-700';
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
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary-50">
            <TableRow>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Contract Name</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Contractor</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Next Milestone</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Value</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => {
              const contractor = getContractorById(contract.contractorId);
              
              return (
                <TableRow key={contract.id} className="hover:bg-primary-50">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-accent-100 text-accent-700 rounded-md flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-primary-900">{contract.contractName}</div>
                        <div className="text-xs text-primary-500">{contract.contractCode}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center overflow-hidden text-primary-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-primary-900">{contractor?.firstName} {contractor?.lastName}</div>
                        <div className="text-xs text-primary-500">{contractor?.title}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(contract.status)}`}>
                      {formatStatus(contract.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary-900">Final Design Delivery</div>
                    <div className="text-xs text-primary-500">Due in 4 days</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
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
                        className="text-primary-500 hover:text-primary-600" 
                        title="Edit Contract"
                        onClick={() => onEditContract && onEditContract(contract.id)}
                      >
                        <Edit size={16} />
                      </button>
                      <button className="text-primary-500 hover:text-primary-600" title="More Options">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {contracts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-primary-500">
                  No contracts found
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
