import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Milestone, Contract } from "@shared/schema";
import { CheckCircle, Clock, Calendar, FileText, AlertCircle } from "lucide-react";

interface MilestonesListProps {
  milestones: Milestone[];
  contracts: Contract[];
  onViewMilestone?: (id: number) => void;
  onApproveMilestone?: (id: number) => void;
  onRequestUpdate?: (id: number) => void;
}

const MilestonesList: React.FC<MilestonesListProps> = ({
  milestones,
  contracts,
  onViewMilestone,
  onApproveMilestone,
  onRequestUpdate
}) => {
  // Filter to show only pending or in_progress milestones
  const pendingMilestones = milestones.filter(
    milestone => milestone.status === 'pending' || milestone.status === 'in_progress'
  );

  // Sort milestones by due date (closest first)
  const sortedMilestones = [...pendingMilestones].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Format date
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Not set";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Get contract title
  const getContractTitle = (contractId: number) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract ? contract.contractName : 'Unknown Contract';
  };

  // Check if milestone is overdue
  const isOverdue = (dueDate: string | Date) => {
    const today = new Date();
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return due < today;
  };

  // Calculate progress percentage based on status
  const getProgressPercentage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 100;
      case 'in_progress':
        return 50;
      case 'pending':
      case 'accepted':
      case 'assigned':
      default:
        return 0;
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center">
          <Clock className="mr-2 h-5 w-5 text-amber-500" />
          Upcoming Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedMilestones.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">All caught up!</h3>
            <p className="text-zinc-400">No pending milestones at the moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMilestones.map(milestone => (
              <div 
                key={milestone.id} 
                className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-white">{milestone.name}</h3>
                    <p className="text-xs text-zinc-400">{getContractTitle(milestone.contractId)}</p>
                  </div>
                  <Badge 
                    className={`${
                      isOverdue(milestone.dueDate) 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : milestone.status === 'in_progress' 
                          ? 'bg-blue-500 hover:bg-blue-600' 
                          : 'bg-amber-500 hover:bg-amber-600'
                    } text-white`}
                  >
                    {isOverdue(milestone.dueDate) 
                      ? 'Overdue' 
                      : milestone.status === 'in_progress' 
                        ? 'In Progress' 
                        : 'Pending'}
                  </Badge>
                </div>
                
                <div className="flex justify-between mb-4">
                  <div className="flex items-center text-sm text-zinc-400">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Due: {formatDate(milestone.dueDate)}</span>
                  </div>
                  <div className="flex items-center text-sm text-zinc-400">
                    <FileText className="h-4 w-4 mr-1" />
                    <span>Progress: {getProgressPercentage(milestone.status)}%</span>
                  </div>
                </div>
                
                {isOverdue(milestone.dueDate) && (
                  <div className="mb-4 p-2 bg-red-900/30 border border-red-900 rounded-md flex items-center text-sm text-red-300">
                    <AlertCircle className="h-4 w-4 mr-2 text-red-400" />
                    This milestone is past its due date.
                  </div>
                )}
                
                <div className="flex space-x-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-white border-zinc-700 hover:bg-zinc-700 hover:text-white flex-1"
                    onClick={() => onViewMilestone && onViewMilestone(milestone.id)}
                  >
                    View Details
                  </Button>
                  {milestone.status === 'in_progress' && (
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      onClick={() => onApproveMilestone && onApproveMilestone(milestone.id)}
                    >
                      Approve
                    </Button>
                  )}
                  {milestone.status === 'pending' && (
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white flex-1"
                      onClick={() => onRequestUpdate && onRequestUpdate(milestone.id)}
                    >
                      Request Update
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MilestonesList;