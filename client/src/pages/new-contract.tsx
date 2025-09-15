import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ContractForm from "@/components/contracts/ContractForm";
import { User, Contract as ContractType } from "@shared/schema";
import { Loader2 } from "lucide-react";

const NewContract = () => {
  const [_, navigate] = useLocation();
  
  // Check if we're in edit mode by parsing the route
  const [isEditMode, params] = useRoute('/contracts/:id/edit');
  const contractId = isEditMode && params?.id ? parseInt(params.id) : null;
  
  // Fetch contractors from dashboard data which includes connected contractors
  const { data: dashboardData, isLoading: isLoadingContractors } = useQuery({
    queryKey: ['/api/dashboard'],
  });
  
  const contractors = dashboardData?.contractors || [];
  
  // Fetch contract details if in edit mode
  const { 
    data: contractData, 
    isLoading: isLoadingContract 
  } = useQuery<ContractType>({
    queryKey: ['/api/contracts', contractId],
    enabled: !!contractId, // Only run this query if we have a contract ID
  });
  
  // Combine loading states
  const isLoading = isLoadingContractors || (contractId && isLoadingContract);

  // Handle successful project creation or update
  const handleSuccess = () => {
    // Navigate back to appropriate list after action
    navigate('/projects');
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-4 text-white hover:bg-zinc-800"
          onClick={() => navigate('/projects')}
        >
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            {contractId ? 'Edit Project' : 'Create New Project'}
          </h1>
          <p className="text-zinc-400 mt-1">
            {contractId 
              ? 'Update your project details, milestones, and payment terms' 
              : 'Set up a new smart contract with predefined milestones and payments'
            }
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-black p-6 rounded-lg shadow-sm border border-zinc-800">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-zinc-400">
              {contractId ? 'Loading project details...' : 'Preparing form...'}
            </span>
          </div>
        ) : (
          <ContractForm 
            contractors={contractors} 
            onSuccess={handleSuccess}
            contractData={contractId ? contractData : undefined}
            isEditMode={!!contractId}
          />
        )}
      </div>
    </>
  );
};

export default NewContract;
