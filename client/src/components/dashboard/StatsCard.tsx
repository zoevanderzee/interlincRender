import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";

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
  const isPositive = changeValue >= 0;
  
  return (
    <Card className="border-zinc-800 bg-zinc-900 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
            <h4 className="text-2xl font-bold text-white">{value}</h4>
            
            {(changeValue !== 0 || changeText) && (
              <div className="flex items-center mt-2">
                <span className={`inline-flex items-center text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                  {Math.abs(changeValue)}%
                </span>
                {changeText && (
                  <span className="text-xs text-zinc-500 ml-1">
                    {changeText}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className={`${iconBgColor} h-10 w-10 rounded-full flex items-center justify-center`}>
            <span className={iconColor}>
              {icon}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;