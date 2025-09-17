import React, { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  changeValue?: number;
  changeText?: string;
}

const StatsCard = ({ 
  title, 
  value, 
  icon, 
  iconBgColor, 
  iconColor,
  changeValue = 0,
  changeText = "" 
}: StatsCardProps) => {
  // Get Stripe Connect account status instead of Trolley wallet balance
  const { data: connectStatus } = useQuery({
    queryKey: ['/api/connect/status'],
    refetchInterval: 30000,
    retry: false,
    staleTime: 10000
  });

  return (
    <Card className="overflow-hidden animate-fade-in hover:animate-glow-pulse">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
            {changeText && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center">
                {changeValue > 0 ? (
                  <ArrowUp className="h-3 w-3 mr-1 text-green-500" />
                ) : changeValue < 0 ? (
                  <ArrowDown className="h-3 w-3 mr-1 text-red-500" />
                ) : null}
                {changeText}
              </p>
            )}
          </div>

          <div className={`${iconBgColor} h-12 w-12 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110`}>
            <span className={iconColor}>
              {icon}
            </span>
          </div>
        </div>
      </CardContent>

      {/* This section is updated to display Stripe Connect status */}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Account</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectStatus?.hasAccount && !connectStatus?.needsOnboarding ? 
                'Connected' : 
                'Setup Required'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {connectStatus?.hasAccount && !connectStatus?.needsOnboarding ? 
                'Stripe Connect ready' : 
                'Complete account setup'
              }
            </p>
          </CardContent>
        </Card>
    </Card>
  );
};

export default StatsCard;