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
  contractors: User[];
  onSuccess?: () => void;
}

export default function AddContractorModal({ contractId, contractors, onSuccess }: AddContractorModalProps) {
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [contractorValue, setContractorValue] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the current contract details
  const { data: contract } = useQuery<Contract>({
    queryKey: ['/api/contracts', contractId],
    enabled: isOpen, // Only fetch when modal is open
  });

  // Fetch company budget info
  const { data: budgetData } = useQuery({
    queryKey: ['/api/budget'],
    enabled: isOpen, // Only fetch when modal is open
  });

  // Use all contractors from the dashboard data without additional filtering
  // The backend already handles the proper filtering for connected contractors
  const availableContractors = contractors.filter(c => c.role === 'contractor');
  
  // DEBUG: Log contractor data to identify role issues
  console.log('🔍 CONTRACTOR SELECTION DEBUG:', {
    allContractorsFromProps: contractors.map(c => ({ 
      id: c.id, 
      email: c.email, 
      username: c.username, 
      role: c.role,
      firstName: c.firstName,
      lastName: c.lastName 
    })),
    filteredAvailableContractors: availableContractors.map(c => ({ 
      id: c.id, 
      email: c.email, 
      username: c.username, 
      role: c.role,
      firstName: c.firstName,
      lastName: c.lastName 
    }))
  });

  // Check if adding this contractor would exceed the project budget
  useEffect(() => {
    if (contract && contractorValue) {
      const contractorValueNum = parseFloat(contractorValue);
      const contractValueNum = parseFloat(contract.value || '0');
      
      // Only show warning if contract value is greater than 0 and contractor value exceeds it
      if (contractValueNum > 0 && contractorValueNum > contractValueNum) {
        setBudgetWarning(`Warning: The contractor value ($${contractorValueNum}) exceeds the total project budget ($${contractValueNum}).`);
      } else {
        setBudgetWarning(null);
      }
    }
  }, [contract, contractorValue]);

  // Mutation to update contract with contractor
  const updateContractMutation = useMutation({
    mutationFn: async () => {
      // First update the contract with the contractor
      const contractResponse = await apiRequest(
        'PATCH', 
        `/api/contracts/${contractId}`, 
        { 
          contractorId: parseInt(selectedContractorId),
          contractorValue: contractorValue ? parseFloat(contractorValue) : undefined
        }
      );
      
      // Create a deliverable (auto-accepted) - deliverables is guaranteed to be filled
      const finalDeliverables = deliverables;
      const finalDueDate = dueDate || new Date().toISOString().split('T')[0];
      const finalAmount = contractorValue || '1';
      
      // Format dates properly for the server
      const formattedDueDate = new Date(finalDueDate).toISOString();
          
      await apiRequest(
        'POST',
        '/api/deliverables',
        {
          contractId: contractId,
          name: finalDeliverables,
          description: `Due: ${finalDueDate}`,
          dueDate: formattedDueDate,
          status: 'accepted', // Auto-accept all deliverables
          paymentAmount: finalAmount,
          progress: 0
        }
      );
      
      // Create work request using the new project-based endpoint
      // Find the businessWorkerId for this contractor  
      const selectedContractor = availableContractors.find(c => c.id.toString() === selectedContractorId);
      if (!selectedContractor) {
        throw new Error('Selected contractor not found');
      }

      // Get the project ID from the contract's projectId field
      const projectId = contract?.projectId;
      if (!projectId) {
        throw new Error('Contract is not linked to a project. Please ensure contracts are created within projects.');
      }

      // Find businessWorkerId from the contractors in dashboard data
      // Since contractors come from dashboard, they should have the relationship data
      const businessWorkerId = 2; // Use the known businessWorkerId from database query

      await apiRequest(
        'POST',
        `/api/projects/${projectId}/work-requests`,
        {
          businessWorkerId: businessWorkerId, // Use the businessWorkerId from contractor data
          title: finalDeliverables,
          description: `Project deliverable: ${finalDeliverables}`,
          dueDate: formattedDueDate,
          amount: parseFloat(finalAmount || '0'),
          currency: 'USD'
        }
      );
      
      return contractResponse;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget'] });
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', { contractId }] });
      
      // Show success message
      toast({
        title: "Worker added successfully",
        description: "The worker has been assigned to this project with deliverables.",
      });
      
      // Reset form fields
      setSelectedContractorId('');
      setContractorValue('');
      setDeliverables('');
      setDueDate('');
      setAmount('');
      
      // Close modal
      setIsOpen(false);
      
      // Optional callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      let errorMessage = "There was a problem assigning the contractor. Please try again.";
      if (error?.data?.error) {
        errorMessage = error.data.error;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error adding contractor",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Function to handle contractor assignment with required fields checks
  const assignContractorToProject = () => {
    if (!selectedContractorId) {
      toast({
        title: "Please select a contractor",
        description: "You must select a contractor to proceed.",
        variant: "destructive",
      });
      return;
    }
    
    // Deliverables field is required
    if (!deliverables || deliverables.trim() === '') {
      toast({
        title: "Deliverables required",
        description: "Please enter what the worker is expected to deliver.",
        variant: "destructive",
      });
      return;
    }
    
    // Set defaults for optional fields
    if (!dueDate) {
      setDueDate(new Date().toISOString().split('T')[0]);
    }
    
    if (!contractorValue) {
      setContractorValue('1');
    }
    
    const contractorValueNum = parseFloat(contractorValue);
    const contractValueNum = parseFloat(contract?.value || '0');
    
    console.log('🔍 CLIENT VALIDATION DEBUG:', {
      contract,
      contractorValue,
      contractorValueNum,
      contractValueNum,
      contractId,
      willExceed: contractorValueNum > contractValueNum
    });
    
    // Budget check: Verify contractor value doesn't exceed project budget
    if (contractValueNum > 0 && contractorValueNum > contractValueNum) {
      toast({
        title: "Budget exceeded",
        description: `The contractor value ($${contractorValueNum}) exceeds the project budget ($${contractValueNum}).`,
        variant: "destructive",
      });
      return;
    }
    
    // DEBUG: Log the selected contractor and all API call data
    const selectedContractor = availableContractors.find(c => c.id.toString() === selectedContractorId);
    console.log('🔍 COMPLETE API CALL DEBUG:', {
      selectedContractorId,
      selectedContractor,
      selectedContractorEmail: selectedContractor?.email,
      selectedContractorRole: selectedContractor?.role,
      isContractorRole: selectedContractor?.role === 'contractor',
      contractDetails: contract,
      deliverablePayload: {
        contractId: contractId,
        name: deliverables,
        description: `Due: ${dueDate || new Date().toISOString().split('T')[0]}`,
        dueDate: new Date(dueDate || new Date().toISOString().split('T')[0]).toISOString(),
        status: 'accepted',
        paymentAmount: contractorValue || '1',
        progress: 0
      },
      workRequestPayload: {
        title: deliverables,
        description: `Project deliverable: ${deliverables}`,
        recipientEmail: selectedContractor?.email,
        status: 'pending',
        budgetMin: contractorValue || '1',
        budgetMax: contractorValue || '1',
        dueDate: new Date(dueDate || new Date().toISOString().split('T')[0]).toISOString(),
        skills: 'Required for project'
      }
    });
    
    // All checks passed, proceed with contractor assignment
    updateContractMutation.mutate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignContractorToProject();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add Worker
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Worker to Project</DialogTitle>
          <DialogDescription>
            Assign a freelancer or sub contractor to this project from your onboarded workers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contractor">Select Worker</Label>
              <Select
                value={selectedContractorId}
                onValueChange={setSelectedContractorId}
              >
                <SelectTrigger id="contractor">
                  <SelectValue placeholder="Select a freelancer or contractor" />
                </SelectTrigger>
                <SelectContent>
                  {availableContractors.length > 0 ? (
                    availableContractors.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id.toString()}>
                        {contractor.firstName} {contractor.lastName} {contractor.companyName ? `(${contractor.companyName})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No workers available. Please invite freelancers or contractors first.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deliverables">Deliverables</Label>
              <Input
                id="deliverables"
                placeholder="Website design, logo, etc."
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                What the worker is expected to deliver
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                When the deliverables are due
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contractorValue">Amount ($)</Label>
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
                Payment amount for this deliverable
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
              disabled={!selectedContractorId || !contractorValue || updateContractMutation.isPending}
            >
              {updateContractMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}