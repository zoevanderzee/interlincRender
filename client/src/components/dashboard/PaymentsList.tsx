import React from "react";
import { Card } from "@/components/ui/card";
import { Payment, Contract, User } from "@shared/schema";
import { DollarSign } from "lucide-react";

interface PaymentsListProps {
  payments: Payment[];
  contracts: Contract[];
  contractors: User[];
  totalUpcoming?: number;
}

const PaymentsList = ({ 
  payments, 
  contracts, 
  contractors,
  totalUpcoming 
}: PaymentsListProps) => {
  
  const getContractById = (id: number) => {
    return contracts.find(contract => contract.id === id);
  };
  
  const getContractorById = (id: number) => {
    return contractors.find(contractor => contractor.id === id);
  };
  
  const getContractorForPayment = (payment: Payment) => {
    const contract = getContractById(payment.contractId);
    if (!contract) return null;
    return getContractorById(contract.contractorId);
  };
  
  const getFormattedDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const getPaymentTypeIcon = (payment: Payment) => {
    const iconClassMap: Record<string, string> = {
      'scheduled': 'bg-success-100 text-success',
      'processing': 'bg-warning-100 text-warning',
      'completed': 'bg-accent-100 text-accent-500',
      'failed': 'bg-destructive-100 text-destructive'
    };
    
    return iconClassMap[payment.status] || 'bg-primary-100 text-primary-700';
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-sm border border-primary-100">
      <div className="p-5 border-b border-primary-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-primary-900">Payment Schedule</h3>
          <div className="relative">
            <select className="appearance-none bg-primary-50 border border-primary-300 text-primary-700 py-1 px-3 pr-8 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent">
              <option>This Month</option>
              <option>Next Month</option>
              <option>Next 3 Months</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="text-xs" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-hidden">
        {payments.map((payment) => {
          const contract = getContractById(payment.contractId);
          const contractor = getContractorForPayment(payment);
          
          return (
            <div key={payment.id} className="p-4 border-b border-primary-100 flex items-center justify-between hover:bg-primary-50">
              <div className="flex items-center">
                <div className={`h-10 w-10 rounded-md ${getPaymentTypeIcon(payment)} flex items-center justify-center`}>
                  <DollarSign size={18} />
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-primary-900">
                    {contract?.contractName} - {payment.notes?.split(' - ')[1] || 'Payment'}
                  </h4>
                  <p className="text-xs text-primary-500">
                    {contractor?.firstName} {contractor?.lastName} • {payment.notes?.split(' - ')[0] || 'Payment'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary-900">
                  ${parseFloat(payment.amount.toString()).toLocaleString('en-US')}
                </div>
                <div className="text-xs text-primary-500">{getFormattedDate(payment.scheduledDate)}</div>
              </div>
            </div>
          );
        })}
        
        {payments.length === 0 && (
          <div className="p-4 text-center text-primary-500">
            No upcoming payments
          </div>
        )}
      </div>
      
      {totalUpcoming !== undefined && (
        <div className="p-4 bg-primary-50 border-t border-primary-100">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium text-primary-700">Total upcoming payments</div>
            <div className="text-lg font-semibold text-primary-900">
              ${totalUpcoming.toLocaleString('en-US')}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PaymentsList;
