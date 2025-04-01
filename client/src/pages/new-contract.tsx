import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ContractForm from "@/components/contracts/ContractForm";
import { User } from "@shared/schema";

const NewContract = () => {
  const [_, navigate] = useLocation();

  // Fetch contractors for the select field
  const { data: contractors = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users', { role: 'contractor' }],
  });

  // Handle successful project creation
  const handleSuccess = () => {
    // Navigate back to projects list after successful creation
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
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Create New Project</h1>
          <p className="text-zinc-400 mt-1">
            Set up a new smart contract with predefined milestones and payments
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-black p-6 rounded-lg shadow-sm border border-zinc-800">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-10 bg-zinc-800 rounded"></div>
            <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
            <div className="h-10 bg-zinc-800 rounded"></div>
            <div className="h-20 bg-zinc-800 rounded"></div>
            <div className="h-10 bg-zinc-800 rounded"></div>
          </div>
        ) : (
          <ContractForm 
            contractors={contractors} 
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </>
  );
};

export default NewContract;
