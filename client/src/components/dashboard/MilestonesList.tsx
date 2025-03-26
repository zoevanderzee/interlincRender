import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Milestone, Contract, User } from "@shared/schema";

interface MilestonesListProps {
  milestones: Milestone[];
  contracts: Contract[];
  contractors: User[];
  onViewDetails?: (id: number) => void;
  onApprove?: (id: number) => void;
  onRequestUpdate?: (id: number) => void;
}

const MilestonesList = ({ 
  milestones, 
  contracts, 
  contractors,
  onViewDetails,
  onApprove,
  onRequestUpdate
}: MilestonesListProps) => {
  
  const getContractById = (id: number) => {
    return contracts.find(contract => contract.id === id);
  };
  
  const getContractorById = (id: number) => {
    return contractors.find(contractor => contractor.id === id);
  };
  
  const getContractorForMilestone = (milestone: Milestone) => {
    const contract = getContractById(milestone.contractId);
    if (!contract) return null;
    return getContractorById(contract.contractorId);
  };
  
  const getDueDateString = (dueDate: Date) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue - ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Due Today';
    } else if (diffDays === 1) {
      return 'Due Tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };
  
  const getDueDateStatusClass = (dueDate: Date) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'bg-destructive-100 text-destructive';
    } else if (diffDays <= 2) {
      return 'bg-warning-100 text-warning';
    } else {
      return 'bg-success-100 text-success';
    }
  };
  
  const getProgressBarColor = (milestone: Milestone) => {
    if (milestone.status === 'overdue') return 'bg-warning';
    return 'bg-accent-500';
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-sm border border-primary-100 divide-y divide-primary-100">
      {milestones.map((milestone) => {
        const contract = getContractById(milestone.contractId);
        const contractor = getContractorForMilestone(milestone);
        
        return (
          <div key={milestone.id} className="p-4 hover:bg-primary-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-primary-900">{milestone.name}</h3>
                <p className="text-xs text-primary-500 mt-1">
                  {contract?.contractName} • {contractor?.firstName} {contractor?.lastName}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDueDateStatusClass(milestone.dueDate)}`}>
                {getDueDateString(milestone.dueDate)}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-primary-500 mb-1">
                <span>Progress</span>
                <span>{milestone.progress}%</span>
              </div>
              <div className="w-full bg-primary-100 rounded-full h-2">
                <div 
                  className={`${getProgressBarColor(milestone)} h-2 rounded-full`} 
                  style={{ width: `${milestone.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-3 flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onViewDetails && onViewDetails(milestone.id)}
              >
                View Details
              </Button>
              
              {milestone.status === 'pending' && milestone.progress >= 80 && (
                <Button 
                  size="sm"
                  onClick={() => onApprove && onApprove(milestone.id)}
                >
                  Approve
                </Button>
              )}
              
              {milestone.status === 'overdue' && (
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => onRequestUpdate && onRequestUpdate(milestone.id)}
                >
                  Request Update
                </Button>
              )}
            </div>
          </div>
        );
      })}
      
      {milestones.length === 0 && (
        <div className="p-4 text-center text-primary-500">
          No upcoming milestones
        </div>
      )}
    </Card>
  );
};

export default MilestonesList;
