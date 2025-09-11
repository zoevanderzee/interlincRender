import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <Card className="col-span-full animate-fade-in">
      <CardContent className="p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-4">
          <Icon size={24} />
        </div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>
        {action && action}
      </CardContent>
    </Card>
  );
};