import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contract, Deliverable, User } from '@shared/schema';
import { format } from 'date-fns';
import { CheckCircle, Circle, Clock, AlertCircle, ArrowRight, Award, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ContractTimelineProps {
  contract: Contract | null;
  deliverables: Deliverable[];
  contractor?: User;
  onDeliverableComplete?: (id: number) => void;
  onDeliverableApprove?: (id: number) => void;
}

const ContractTimeline = ({
  contract,
  deliverables,
  contractor,
  onDeliverableComplete,
  onDeliverableApprove
}: ContractTimelineProps) => {
  const [celebrating, setCelebrating] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Trolley payment mutation
  const payDeliverableMutation = useMutation({
    mutationFn: async ({ deliverableId, amount }: { deliverableId: number; amount: string }) => {
      const response = await fetch('/api/trolley/pay-deliverable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          deliverableId,
          amount: parseFloat(amount),
          currency: 'GBP'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payment failed');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Payment Processed",
        description: `Payment of £${variables.amount} has been sent to the contractor via Trolley.`,
      });
      
      // Refresh contract and deliverable data
      queryClient.invalidateQueries({ queryKey: ['/api/deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      
      setProcessingPayment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment through Trolley.",
        variant: "destructive"
      });
      setProcessingPayment(null);
    }
  });

  // Sort deliverables by due date
  const sortedDeliverables = [...deliverables]
    .filter(m => m.contractId === (contract?.id || 0))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Calculate contract progress
  const totalDeliverables = sortedDeliverables.length;
  const completedDeliverables = sortedDeliverables.filter(
    m => m.status === 'completed' || m.status === 'approved'
  ).length;
  
  const progress = totalDeliverables > 0 
    ? Math.round((completedDeliverables / totalDeliverables) * 100) 
    : 0;

  // Handle deliverable celebration
  const handleCelebration = (deliverableId: number) => {
    setCelebrating(deliverableId);
    setShowConfetti(true);
    
    // Hide celebration after 5 seconds
    setTimeout(() => {
      setCelebrating(null);
      setShowConfetti(false);
    }, 5000);
  };

  // Handle deliverable completion
  const handleComplete = (deliverable: Deliverable) => {
    if (onDeliverableComplete) {
      onDeliverableComplete(deliverable.id);
      handleCelebration(deliverable.id);
    }
  };

  // Handle deliverable approval
  const handleApprove = (deliverable: Deliverable) => {
    if (onDeliverableApprove) {
      onDeliverableApprove(deliverable.id);
      handleCelebration(deliverable.id);
    }
  };

  // Handle Trolley payment processing
  const handlePayDeliverable = (deliverable: Deliverable) => {
    setProcessingPayment(deliverable.id);
    payDeliverableMutation.mutate({
      deliverableId: deliverable.id,
      amount: deliverable.paymentAmount.toString()
    });
  };

  // Get status icon based on deliverable status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-success" />;
      case 'approved':
        return <Award className="h-6 w-6 text-accent-500" />;
      case 'overdue':
        return <AlertCircle className="h-6 w-6 text-warning" />;
      case 'pending':
        return <Clock className="h-6 w-6 text-primary-500" />;
      default:
        return <Circle className="h-6 w-6 text-primary-300" />;
    }
  };

  // Get status color based on deliverable status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'approved':
        return 'bg-accent-500';
      case 'overdue':
        return 'bg-warning';
      case 'pending':
        return 'bg-primary-500';
      default:
        return 'bg-primary-300';
    }
  };

  // Render confetti animation
  const renderConfetti = () => {
    if (!showConfetti) return null;

    const confettiColors = ['#FFC700', '#FF0000', '#2E93FF', '#13D38E'];
    const confettiElements = [];

    for (let i = 0; i < 50; i++) {
      const size = Math.random() * 8 + 4;
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      const left = Math.random() * 100;
      const animationDuration = Math.random() * 3 + 2;
      const delay = Math.random() * 0.5;

      confettiElements.push(
        <motion.div
          key={i}
          initial={{ y: -20, x: left + '%', opacity: 1 }}
          animate={{
            y: '100vh',
            x: [left + '%', (left - 10) + '%', (left + 10) + '%', (left - 5) + '%', (left + 5) + '%'],
            opacity: [1, 1, 1, 0.5, 0]
          }}
          transition={{
            duration: animationDuration,
            delay: delay,
            ease: 'easeOut'
          }}
          style={{
            position: 'fixed',
            top: 0,
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: color,
            zIndex: 1000
          }}
        />
      );
    }

    return confettiElements;
  };

  return (
    <div className="relative">
      {/* Confetti animation */}
      {renderConfetti()}

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-primary-900">Contract Progress</h3>
          <span className="text-primary-700 font-semibold">{progress}%</span>
        </div>
        <div className="h-4 bg-primary-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-8 border-l-2 border-primary-200">
        {sortedDeliverables.map((deliverable, index) => {
          const isCelebrating = celebrating === deliverable.id;
          const isCompleted = deliverable.status === 'completed' || deliverable.status === 'approved';
          
          return (
            <div key={deliverable.id} className="mb-12 relative">
              {/* Timeline node */}
              <div 
                className={`absolute left-[-16px] top-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  isCelebrating ? 'bg-accent-100' : 'bg-white'
                } border-2 ${getStatusColor(deliverable.status)} z-10`}
              >
                {getStatusIcon(deliverable.status)}
              </div>
              
              {/* Connect line to next deliverable */}
              {index < sortedDeliverables.length - 1 && (
                <div className="absolute left-[-2px] top-7 bottom-[-45px] w-0.5 bg-primary-200"></div>
              )}
              
              {/* Deliverable card */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: isCelebrating ? [1, 1.02, 1] : 1,
                  boxShadow: isCelebrating 
                    ? ['0 0 0 rgba(255, 204, 0, 0)', '0 0 20px rgba(255, 204, 0, 0.5)', '0 0 0 rgba(255, 204, 0, 0)'] 
                    : 'none'
                }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.2,
                  repeat: isCelebrating ? 2 : 0,
                  repeatType: "reverse"
                }}
              >
                <Card 
                  className={`p-4 ${isCelebrating ? 'border-accent-300 bg-gradient-to-r from-white to-accent-50' : 'border-primary-100'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h4 className="font-medium text-primary-900 mr-2">{deliverable.name}</h4>
                        <Badge 
                          variant={
                            deliverable.status === 'completed' ? 'success' :
                            deliverable.status === 'approved' ? 'default' :
                            deliverable.status === 'overdue' ? 'destructive' : 'outline'
                          }
                          className="ml-2"
                        >
                          {deliverable.status.charAt(0).toUpperCase() + deliverable.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-primary-600 mb-2">{deliverable.description || 'No description provided'}</p>
                      
                      <div className="flex items-center text-sm text-primary-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Due: {format(new Date(deliverable.dueDate), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-center gap-2">
                      <div className="font-medium text-primary-900">${deliverable.paymentAmount}</div>
                      {!isCompleted && deliverable.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleComplete(deliverable)}
                        >
                          Mark Complete
                        </Button>
                      )}
                      {deliverable.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleApprove(deliverable)}
                        >
                          Approve
                        </Button>
                      )}
                      {deliverable.status === 'approved' && (
                        <Button 
                          size="sm" 
                          onClick={() => handlePayDeliverable(deliverable)}
                          disabled={processingPayment === deliverable.id || payDeliverableMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {processingPayment === deliverable.id ? (
                            <>
                              <Clock className="h-4 w-4 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay via Trolley
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Celebration animation */}
                  <AnimatePresence>
                    {isCelebrating && (
                      <motion.div 
                        className="mt-3 p-3 bg-accent-50 rounded-md border border-accent-200"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="flex items-center">
                          <div className="mr-2 text-accent-500">
                            <Award className="h-6 w-6" />
                          </div>
                          <div>
                            <h5 className="font-medium text-accent-700">Deliverable {deliverable.status === 'approved' ? 'Approved' : 'Completed'}!</h5>
                            <p className="text-sm text-accent-600">
                              {deliverable.status === 'approved' 
                                ? 'Great work! Payment for this deliverable has been processed.' 
                                : 'Congratulations on completing this deliverable!'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            </div>
          );
        })}
        
        {/* Contract completion node */}
        <div className="mb-8 relative">
          <div className={`absolute left-[-16px] top-0 w-7 h-7 rounded-full flex items-center justify-center
            bg-white border-2 ${progress === 100 ? 'border-success' : 'border-primary-300'} z-10`}
          >
            {progress === 100 ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5 text-primary-300" />
            )}
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              scale: progress === 100 ? [1, 1.05, 1] : 1,
            }}
            transition={{ 
              duration: 0.5,
              delay: sortedDeliverables.length * 0.2
            }}
          >
            <Card className={`p-4 ${progress === 100 ? 'border-success bg-success-50' : 'border-primary-100'}`}>
              <div className="flex items-center">
                <div className="mr-3">
                  {progress === 100 ? (
                    <Award className="h-6 w-6 text-success" />
                  ) : (
                    <ArrowRight className="h-6 w-6 text-primary-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-primary-900">Contract Completion</h4>
                  <p className="text-sm text-primary-600">
                    {progress === 100 
                      ? 'All deliverables have been completed and approved!' 
                      : `${completedDeliverables} of ${totalDeliverables} deliverables completed`
                    }
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ContractTimeline;