import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Payment, Contract, Milestone } from "@shared/schema";
import { DollarSign, Calendar, AlertCircle, CheckCircle, Link, ExternalLink } from "lucide-react";

interface PaymentsListProps {
  payments: Payment[];
  contracts: Contract[];
  milestones: Milestone[];
  onViewPayment?: (id: number) => void;
}

const PaymentsList: React.FC<PaymentsListProps> = ({
  payments,
  contracts,
  milestones,
  onViewPayment
}) => {
  // Sort payments by scheduled date (most recent first)
  const sortedPayments = [...payments]
    .filter(payment => payment.status === 'pending' || payment.status === 'processing')
    .sort((a, b) => {
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });

  // Format date
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  // Get contract title
  const getContractTitle = (contractId: number) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract ? contract.contractName : 'Unknown Contract';
  };

  // Get milestone title
  const getMilestoneTitle = (milestoneId: number) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    return milestone ? milestone.name : 'Unknown Milestone';
  };

  // Check if payment is due soon (within 3 days)
  const isDueSoon = (scheduledDate: string | Date) => {
    const today = new Date();
    const due = typeof scheduledDate === 'string' ? new Date(scheduledDate) : scheduledDate;
    const diffTime = due.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays <= 3 && diffDays >= 0;
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center">
          <DollarSign className="mr-2 h-5 w-5 text-green-500" />
          Upcoming Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedPayments.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">No pending payments!</h3>
            <p className="text-zinc-400">All payments are up to date</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPayments.map(payment => (
              <div 
                key={payment.id} 
                className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-white">
                      Payment #{payment.id}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      <span className="mr-2">{getContractTitle(payment.contractId)}</span>
                      <span>&#8226;</span>
                      <span className="ml-2">{getMilestoneTitle(payment.milestoneId)}</span>
                    </p>
                  </div>
                  <Badge 
                    className={`${
                      payment.status === 'processing' 
                        ? 'bg-blue-500 hover:bg-blue-600' 
                        : 'bg-amber-500 hover:bg-amber-600'
                    } text-white`}
                  >
                    {payment.status === 'processing' ? 'Processing' : 'Pending'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center text-sm text-zinc-400">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Scheduled: {formatDate(payment.scheduledDate)}</span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
                
                {isDueSoon(payment.scheduledDate) && (
                  <div className="mb-4 p-2 bg-amber-900/30 border border-amber-900 rounded-md flex items-center text-sm text-amber-300">
                    <AlertCircle className="h-4 w-4 mr-2 text-amber-400" />
                    Payment due soon! Please ensure funds are available.
                  </div>
                )}
                
                <div className="flex space-x-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-white border-zinc-700 hover:bg-zinc-700 hover:text-white flex-1"
                    onClick={() => onViewPayment && onViewPayment(payment.id)}
                  >
                    View Details
                  </Button>
                  
                  {payment.stripePaymentIntentId && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-green-500 border-green-700 hover:bg-green-900/30 hover:text-green-400 flex-1"
                      onClick={() => window.open(`https://dashboard.stripe.com/payments/${payment.stripePaymentIntentId}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Stripe Dashboard
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

export default PaymentsList;