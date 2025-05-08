import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Contract, User } from "@shared/schema";
import { Calendar, Briefcase, Edit, Eye, MoreHorizontal, ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ContractsTableProps {
  contracts: Contract[];
  contractors: User[];
  onViewContract?: (id: number) => void;
  onEditContract?: (id: number) => void;
}

const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  contractors,
  onViewContract,
  onEditContract
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortField, setSortField] = React.useState<string>("createdAt");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  // Format date
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "N/A";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  // Get contractor name
  const getContractorName = (contractorId: number) => {
    const contractor = contractors.find(c => c.id === contractorId);
    return contractor ? `${contractor.firstName} ${contractor.lastName}` : 'Unknown';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string, label: string }> = {
      active: { color: "bg-green-500 hover:bg-green-600", label: "Active" },
      draft: { color: "bg-amber-500 hover:bg-amber-600", label: "Draft" },
      completed: { color: "bg-blue-500 hover:bg-blue-600", label: "Completed" },
      terminated: { color: "bg-red-500 hover:bg-red-600", label: "Terminated" }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { color: "bg-zinc-500", label: status };
    
    return (
      <Badge className={`${statusInfo.color} text-white`}>
        {statusInfo.label}
      </Badge>
    );
  };

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort contracts
  const filteredAndSortedContracts = React.useMemo(() => {
    // Filter first
    const filtered = contracts.filter(contract =>
      contract.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getContractorName(contract.contractorId).toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Then sort
    return [...filtered].sort((a, b) => {
      let valueA, valueB;
      
      // Handle different field types
      switch(sortField) {
        case "contractName":
          valueA = a.contractName.toLowerCase();
          valueB = b.contractName.toLowerCase();
          break;
        case "contractorId":
          valueA = getContractorName(a.contractorId).toLowerCase();
          valueB = getContractorName(b.contractorId).toLowerCase();
          break;
        case "value":
          valueA = parseFloat(a.value);
          valueB = parseFloat(b.value);
          break;
        case "startDate":
          valueA = a.startDate ? new Date(a.startDate).getTime() : 0;
          valueB = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case "status":
          valueA = a.status.toLowerCase();
          valueB = b.status.toLowerCase();
          break;
        case "createdAt":
        default:
          valueA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valueB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
      }
      
      // Compare based on direction
      if (sortDirection === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }, [contracts, searchTerm, sortField, sortDirection]);

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-lg text-white flex items-center">
            <Briefcase className="mr-2 h-5 w-5 text-blue-500" />
            Recent Projects
          </CardTitle>
          
          <div className="relative w-full md:w-60">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
            <Input
              className="pl-9 bg-zinc-800 border-zinc-700 text-white w-full"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-zinc-700 overflow-hidden">
          <Table className="text-white">
            <TableHeader className="bg-zinc-800">
              <TableRow className="hover:bg-zinc-700 border-b border-zinc-700">
                <TableHead 
                  className="hover:bg-zinc-700/50 cursor-pointer text-zinc-400 h-10"
                  onClick={() => handleSort("contractName")}
                >
                  <div className="flex items-center">
                    Project Name
                    {sortField === "contractName" && (
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="hover:bg-zinc-700/50 cursor-pointer text-zinc-400 h-10"
                  onClick={() => handleSort("contractorId")}
                >
                  <div className="flex items-center">
                    Contractor
                    {sortField === "contractorId" && (
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="hover:bg-zinc-700/50 cursor-pointer text-zinc-400 h-10"
                  onClick={() => handleSort("value")}
                >
                  <div className="flex items-center">
                    Value
                    {sortField === "value" && (
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="hover:bg-zinc-700/50 cursor-pointer text-zinc-400 h-10"
                  onClick={() => handleSort("startDate")}
                >
                  <div className="flex items-center">
                    Start Date
                    {sortField === "startDate" && (
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="hover:bg-zinc-700/50 cursor-pointer text-zinc-400 h-10"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    {sortField === "status" && (
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right text-zinc-400 h-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedContracts.length === 0 ? (
                <TableRow className="hover:bg-zinc-800 border-b border-zinc-700">
                  <TableCell colSpan={6} className="text-center py-6 text-zinc-400">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedContracts.map((contract) => (
                  <TableRow 
                    key={contract.id} 
                    className="hover:bg-zinc-800 border-b border-zinc-700"
                  >
                    <TableCell className="font-medium">
                      {contract.contractName}
                    </TableCell>
                    <TableCell>
                      {getContractorName(contract.contractorId)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(contract.value)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500 mr-1.5" />
                        {formatDate(contract.startDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(contract.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-zinc-700" />
                          <DropdownMenuItem 
                            className="hover:bg-zinc-800 cursor-pointer"
                            onClick={() => onViewContract && onViewContract(contract.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {(contract.status === 'draft' || contract.status === 'active') && (
                            <DropdownMenuItem 
                              className="hover:bg-zinc-800 cursor-pointer"
                              onClick={() => onEditContract && onEditContract(contract.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Project
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractsTable;