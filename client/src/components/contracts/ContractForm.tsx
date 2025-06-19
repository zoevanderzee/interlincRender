import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { insertContractSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface ContractFormProps {
  onSuccess?: () => void;
  contractData?: any;
  isEditMode?: boolean;
}

const ContractForm = ({ 
  onSuccess,
  contractData,
  isEditMode = false
}: ContractFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const contractFormSchema = z.object({
    contractName: z.string().min(2, {
      message: "Contract name must be at least 2 characters.",
    }),
    description: z.string().min(10, {
      message: "Description must be at least 10 characters.",
    }),
    status: z.string().min(1, "Status is required"),
    startDate: z.date().min(new Date("2020-01-01"), {
      message: "Start date must be after January 1, 2020",
    }),
    endDate: z.date().min(new Date(), {
      message: "End date must be in the future",
    }),
    value: z.string().min(1, "Value is required").regex(/^\d+(\.\d{1,2})?$/, {
      message: "Value must be a valid amount (e.g. 1000 or 1000.50)",
    }),
  });

  const getDefaultValues = () => {
    if (isEditMode && contractData) {
      const startDate = contractData.startDate 
        ? new Date(contractData.startDate) 
        : new Date();
      
      const endDate = contractData.endDate 
        ? new Date(contractData.endDate) 
        : new Date(new Date().setMonth(new Date().getMonth() + 3));
      
      return {
        contractName: contractData.contractName || "",
        description: contractData.description || "",
        status: contractData.status || "Draft",
        startDate,
        endDate,
        value: contractData.value?.toString() || "",
      };
    }

    return {
      contractName: "",
      description: "",
      status: "Draft",
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      value: "",
    };
  };

  const form = useForm<z.infer<typeof contractFormSchema>>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: getDefaultValues(),
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contractFormSchema>) => {
      const endpoint = isEditMode ? `/api/contracts/${contractData.id}` : '/api/contracts';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const payload = {
        ...data,
        businessId: user?.id,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      };

      const response = await apiRequest(method, endpoint, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      toast({
        title: isEditMode ? "Project Updated" : "Project Created",
        description: isEditMode 
          ? "The project has been updated successfully." 
          : "Your new project has been created successfully.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      console.error('Contract creation error:', error);
      
      // Show specific budget error message if budget exceeded
      if (error?.data?.budgetExceeded) {
        toast({
          title: "Budget Exceeded",
          description: `Available budget: ${error.data.availableBudget}, but you need ${error.data.requestedAmount}. Please increase your budget or reduce the project value.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} project. Please try again.`,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: z.infer<typeof contractFormSchema>) => {
    createContractMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="contractName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Project Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter project name" 
                  {...field} 
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </FormControl>
              <FormDescription className="text-zinc-400">
                A clear, descriptive name for your project. We'll automatically generate a unique project code for you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the project requirements, deliverables, and expectations..."
                  className="resize-none bg-zinc-900 border-zinc-700 text-white"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-zinc-400">
                A clear description of the work to be performed
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Project Value</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400">$</span>
                    <Input 
                      placeholder="4000" 
                      {...field} 
                      className="pl-8 bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>
                </FormControl>
                <FormDescription className="text-zinc-400">
                  Total project value in USD
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-white">Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="w-full pl-3 text-left font-normal bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-800 border-zinc-700" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                      className="bg-zinc-800 text-white"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-white">End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="w-full pl-3 text-left font-normal bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-800 border-zinc-700" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                      className="bg-zinc-800 text-white"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Select project status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription className="text-zinc-400">
                The current status of this project
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button 
            type="reset" 
            variant="outline" 
            className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800"
            onClick={() => form.reset(getDefaultValues())}
          >
            Reset
          </Button>
          <Button 
            type="submit" 
            className="flex-1" 
            disabled={createContractMutation.isPending}
          >
            {createContractMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditMode ? 'Update Project' : 'Create Project'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ContractForm;