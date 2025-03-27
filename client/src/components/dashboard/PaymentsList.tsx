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
      'scheduled': 'bg-green-900 text-green-400',
      'processing': 'bg-amber-900 text-amber-400',
      'completed': 'bg-blue-900 text-blue-400',
      'failed': 'bg-red-900 text-red-400'
    };
    
    return iconClassMap[payment.status] || 'bg-zinc-800 text-gray-400';
  };
  
  return (
    <Card className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Payment Schedule</h3>
          <div className="relative">
            <select className="appearance-none bg-zinc-800 border border-zinc-700 text-white py-1 px-3 pr-8 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent">
              <option>This Month</option>
              <option>Next Month</option>
              <option>Next 3 Months</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
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
            <div key={payment.id} className="p-4 border-b border-zinc-800 flex items-center justify-between hover:bg-zinc-800">
              <div className="flex items-center">
                <div className={`h-10 w-10 rounded-md ${getPaymentTypeIcon(payment)} flex items-center justify-center`}>
                  <DollarSign size={18} />
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-white">
                    {contract?.contractName} - {payment.notes?.split(' - ')[1] || 'Payment'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {contractor?.firstName} {contractor?.lastName} • {payment.notes?.split(' - ')[0] || 'Payment'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-white">
                  ${parseFloat(payment.amount.toString()).toLocaleString('en-US')}
                </div>
                <div className="text-xs text-gray-400">{getFormattedDate(payment.scheduledDate)}</div>
              </div>
            </div>
          );
        })}
        
        {payments.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            No upcoming payments
          </div>
        )}
      </div>
      
      {totalUpcoming !== undefined && (
        <div className="p-4 bg-zinc-800 border-t border-zinc-700">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium text-gray-300">Total upcoming payments</div>
            <div className="text-lg font-semibold text-white">
              ${totalUpcoming.toLocaleString('en-US')}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PaymentsList;
