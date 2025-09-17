
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, DollarSign, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AddContractorModalProps {
  contractId: number;
  onSuccess?: () => void;
}

export default function AddContractorModal({ contractId, onSuccess }: AddContractorModalProps) {
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [contractorValue, setContractorValue] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch connected contractors from database
  const { data: contractorsData, isLoading: isLoadingContractors } = useQuery<User[]>({
    queryKey: ['/api/users', { role: 'contractor' }],
    enabled: isOpen,
  });

  // Fetch the current contract details
  const { data: contract } = useQuery<Contract>({
    queryKey: ['/api/contracts', contractId],
    enabled: isOpen,
  });

  // Show all connected contractors from the database
  const availableContractors = (contractorsData || []).filter(contractor => 
    contractor.role === 'contractor'
  );

  console.log('Connected contractors from database:', {
    total: contractorsData?.length || 0,
    available: availableContractors.length,
    contractors: availableContractors.map(c => ({
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
      console.log('Assigning contractor to contract:', {
        contractId,
        selectedContractorId,
        contractorValue
      });

      return await apiRequest(
        'PATCH', 
        `/api/contracts/${contractId}`, 
        { 
          contractorId: parseInt(selectedContractorId),
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

      setSelectedContractorId('');
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

    if (!selectedContractorId) {
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
            Select a connected contractor with payment setup to assign to this project.
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
                <Select
                  value={selectedContractorId}
                  onValueChange={setSelectedContractorId}
                >
                  <SelectTrigger id="contractor">
                    <SelectValue placeholder="Choose a contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContractors.length > 0 ? (
                      availableContractors.map((contractor) => (
                        <SelectItem key={contractor.id} value={contractor.id.toString()}>
                          {contractor.firstName && contractor.lastName 
                            ? `${contractor.firstName} ${contractor.lastName}`
                            : contractor.username || contractor.email
                          }
                          {contractor.companyName ? ` (${contractor.companyName})` : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No connected contractors available. Please connect with contractors first.
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Select from your connected contractors
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
              disabled={!selectedContractorId || updateContractMutation.isPending}
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
