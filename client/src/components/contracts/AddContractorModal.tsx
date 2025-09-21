import React, { useState, useEffect } from 'react';
import { Contract, User } from '@shared/schema';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, DollarSign, Loader2, User as UserIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';


interface AddContractorModalProps {
  contractId: number;
  onSuccess?: () => void;
}

interface ContractFormData {
  value: string;
}

export default function AddContractorModal({ contractId, onSuccess }: AddContractorModalProps) {
  const [selectedContractor, setSelectedContractor] = useState<any>(null); // Use 'any' for now, will refine if schema is available
  const [contractorValue, setContractorValue] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Mock user data, replace with actual user context or state management
  const user = { id: 1, username: 'Test User' }; 

  // Fetch connected contractors from business_workers table
  const { data: businessWorkers, isLoading: isLoadingContractors } = useQuery<any[]>({
    queryKey: ['/api/business-workers/contractors'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/business-workers/contractors');
      return response.json();
    },
    enabled: isOpen && !!user, // Only fetch when modal is open and user is available
  });

  // Fetch the current contract details
  const { data: contract } = useQuery<Contract>({
    queryKey: ['/api/contracts', contractId],
    queryFn: () => apiRequest('GET', `/api/contracts/${contractId}`),
    enabled: isOpen,
  });

  console.log('Connected contractors from business_workers:', businessWorkers);

  // Use contractors from business_workers table - they have 'active' status, not 'accepted'
  const availableContractors = businessWorkers || [];

  console.log('Available contractors:', availableContractors);
  console.log('Business workers raw data:', businessWorkers);

  // Check if adding this contractor would exceed the project budget
  useEffect(() => {
    if (contract && contractorValue) {
      const contractorValueNum = parseFloat(contractorValue);
      const contractValueNum = parseFloat(contract.value || '0');

      if (contractValueNum > 0 && contractorValueNum > contractValueNum) {
        setBudgetWarning(`Warning: The contractor value ($${contractorValueNum}) exceeds the total project budget ($${contractValueNum}).`);
      } else {
        setBudgetWarning(null);
      }
    }
  }, [contract, contractorValue]);

  // Assign contractor to contract
  const updateContractMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContractor) {
        throw new Error('No contractor selected');
      }

      console.log('Assigning contractor to contract:', {
        contractId,
        contractorId: selectedContractor.contractorId,
        contractorValue
      });

      return await apiRequest(
        'PATCH', 
        `/api/contracts/${contractId}`, 
        { 
          contractorId: selectedContractor.id,
          contractorBudget: contractorValue ? parseFloat(contractorValue) : undefined
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });

      toast({
        title: "Contractor assigned successfully",
        description: "The contractor has been assigned to this project.",
      });

      setSelectedContractor(null);
      setContractorValue('');
      setIsOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      let errorMessage = "There was a problem assigning the contractor. Please try again.";
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error assigning contractor",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleContractorSelect = (contractorId: string) => {
    const contractor = availableContractors.find(c => c.id.toString() === contractorId);
    if (contractor) {
      setSelectedContractor(contractor);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContractor) {
      toast({
        title: "Please select a contractor",
        description: "You must select a contractor to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!contractorValue) {
      setContractorValue('0');
    }

    const contractorValueNum = parseFloat(contractorValue || '0');
    const contractValueNum = parseFloat(contract?.value || '0');

    // Budget validation
    if (contractValueNum > 0 && contractorValueNum > contractValueNum) {
      toast({
        title: "Budget exceeded",
        description: `The contractor value ($${contractorValueNum}) exceeds the project budget ($${contractValueNum}).`,
        variant: "destructive",
      });
      return;
    }

    updateContractMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Assign Contractor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Contractor to Project</DialogTitle>
          <DialogDescription>
            Select a contractor from your connected accounts to assign to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contractor">Select Contractor</Label>
              {isLoadingContractors ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading contractors...</span>
                </div>
              ) : (
                <Select onValueChange={handleContractorSelect} value={selectedContractor?.id.toString() || ''}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a contractor">
                      {selectedContractor ? (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">
                            {selectedContractor.firstName && selectedContractor.lastName 
                              ? `${selectedContractor.firstName} ${selectedContractor.lastName}`
                              : selectedContractor.username || 'Contractor'
                            }
                          </span>
                        </div>
                      ) : (
                        'Select a contractor'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {!availableContractors || availableContractors.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        <p>No contractors available</p>
                        <p className="text-xs mt-1">Loading: {isLoadingContractors ? 'Yes' : 'No'}</p>
                        <Button 
                          size="sm" 
                          className="mt-2" 
                          onClick={() => navigate('/contractors')}
                        >
                          Find Contractors
                        </Button>
                      </div>
                    ) : (
                      availableContractors.map((contractor) => (
                        <SelectItem 
                          key={contractor.id} 
                          value={contractor.id.toString()}
                          className="text-white hover:bg-gray-800"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {contractor.firstName && contractor.lastName 
                                ? `${contractor.firstName} ${contractor.lastName}`
                                : contractor.username || 'Contractor'
                              }
                            </span>
                            <span className="text-sm text-gray-400">{contractor.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Select from your connected contractor accounts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractorValue">Budget Allocation ($)</Label>
              <div className="flex relative">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contractorValue"
                  type="number"
                  placeholder="0.00"
                  className="pl-8"
                  value={contractorValue}
                  onChange={(e) => setContractorValue(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Budget allocated to this contractor for this project
              </p>
            </div>

            {budgetWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Budget Warning</AlertTitle>
                <AlertDescription>
                  {budgetWarning}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={updateContractMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedContractor || updateContractMutation.isPending}
            >
              {updateContractMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign to Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}