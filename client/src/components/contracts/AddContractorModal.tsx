
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

interface AddContractorModalProps {
  contractId: number;
  onSuccess?: () => void;
}

export default function AddContractorModal({ contractId, onSuccess }: AddContractorModalProps) {
  const [selectedContractor, setSelectedContractor] = useState<User | null>(null);
  const [contractorValue, setContractorValue] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with contractor role from your connected accounts
  const { data: contractors = [], isLoading: isLoadingContractors } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        headers: {
          'X-User-ID': localStorage.getItem('user_id') || '',
        },
        credentials: 'include'
      });
      const users = await response.json();
      return users.filter((user: User) => user.role === 'contractor');
    },
    enabled: isOpen,
  });

  // Fetch the current contract details
  const { data: contract } = useQuery<Contract>({
    queryKey: ['/api/contracts', contractId],
    enabled: isOpen,
  });

  console.log('Connected contractors from accounts database:', {
    total: contractors.length,
    contractors: contractors.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email
    }))
  });

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
        contractorId: selectedContractor.id,
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
                <div className="space-y-2">
                  {contractors.length > 0 ? (
                    contractors.map((contractor) => (
                      <div
                        key={contractor.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          selectedContractor?.id === contractor.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedContractor(contractor)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {contractor.firstName && contractor.lastName 
                                ? `${contractor.firstName} ${contractor.lastName}`
                                : contractor.username || contractor.email
                              }
                            </div>
                            <div className="text-sm text-gray-500">{contractor.email}</div>
                            {contractor.companyName && (
                              <div className="text-sm text-gray-500">{contractor.companyName}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 border rounded-md">
                      No connected contractors available. Please connect with contractors first.
                    </div>
                  )}
                </div>
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
