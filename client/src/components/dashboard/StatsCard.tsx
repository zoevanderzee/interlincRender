import React from "react";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
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
  changeValue,
  changeText
}: StatsCardProps) => {
  const isPositiveChange = changeValue && changeValue > 0;
  
  return (
    <Card className="p-6 border border-primary-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-primary-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-semibold text-primary-900 mt-1">{value}</h3>
        </div>
        <div className={`h-12 w-12 rounded-full ${iconBgColor} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
      </div>
      
      {(changeValue !== undefined && changeText) && (
        <div className="mt-4 flex items-center text-xs">
          <span className={`flex items-center ${isPositiveChange ? 'text-success' : 'text-danger'}`}>
            {isPositiveChange ? <ArrowUp size={12} className="mr-1" /> : <ArrowDown size={12} className="mr-1" />}
            {Math.abs(changeValue)}%
          </span>
          <span className="text-primary-400 ml-2">{changeText}</span>
        </div>
      )}
    </Card>
  );
};

export default StatsCard;
