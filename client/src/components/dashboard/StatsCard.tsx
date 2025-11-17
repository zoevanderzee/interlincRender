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
    </Card>
  );
};

export default StatsCard;