import React, { useState } from 'react';
import { Contract, User } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Loader2 } from 'lucide-react';

interface AddContractorModalProps {
  contractId: number;
  contractors: User[];
  onSuccess?: () => void;
}

export default function AddContractorModal({ contractId, contractors, onSuccess }: AddContractorModalProps) {
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter contractor/freelancer type users who have been onboarded into the system
  // Making sure we show ALL contractors regardless of their workerType
  console.log("Available contractors before filtering:", contractors);
  const availableContractors = contractors.filter(c => 
    c.role === 'contractor' // Only filter by role 'contractor', don't check workerType
  );
  console.log("Available contractors after filtering:", availableContractors);

  // Mutation to update contract with contractor
  const updateContractMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        'PATCH', 
        `/api/contracts/${contractId}`, 
        { contractorId: parseInt(selectedContractorId) }
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
      
      // Show success message
      toast({
        title: "Contractor added successfully",
        description: "The contractor has been assigned to this contract.",
      });
      
      // Close modal
      setIsOpen(false);
      
      // Optional callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Error adding contractor",
        description: "There was a problem assigning the contractor. Please try again.",
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
    
    updateContractMutation.mutate();
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
              <label htmlFor="contractor" className="text-sm font-medium">
                Select Worker
              </label>
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