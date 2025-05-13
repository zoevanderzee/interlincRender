import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { CalendarIcon, ChevronDownIcon, Loader2 } from "lucide-react";

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
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface ContractFormProps {
  contractors: User[];
  onSuccess?: () => void;
  contractData?: any; // The contract data when in edit mode
  isEditMode?: boolean; // Flag to indicate we're editing
}

const ContractForm = ({ 
  contractors, 
  onSuccess, 
  contractData, 
  isEditMode = false 
}: ContractFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  // Extend the insert schema with additional validation
  const formSchema = insertContractSchema.extend({
    // Allow both date objects and date strings (we'll transform strings to dates in the schema)
    startDate: z.union([
      z.date().min(new Date("2020-01-01"), {
        message: "Start date must be after January 1, 2020",
      }),
      z.string().transform(val => new Date(val))
    ]),
    endDate: z.union([
      z.date().min(new Date(), {
        message: "End date must be in the future",
      }),
      z.string().transform(val => new Date(val))
    ]),
    value: z.string().min(1, "Value is required").regex(/^\d+(\.\d{1,2})?$/, {
      message: "Value must be a valid amount (e.g. 1000 or 1000.50)",
    }),
    // Explicitly make contractorId optional
    contractorId: z.number().optional().nullable(),
  });

  // Form hook
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractName: "",
      contractCode: `SC-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-`,
      businessId: user?.id || 0, // Use the current user's ID
      contractorId: undefined, // No contractor selected initially - they will be added after project creation
      description: "", // Always default to empty string, not null
      status: "draft",
      value: "",
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)), // Default 3 months from now
    },
  });

  // Submit mutation
  const createContractMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/contracts", data);
    },
    onSuccess: () => {
      toast({
        title: "Project created",
        description: "The project has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setSubmitting(true);
      // Ensure the businessId is always the current user's id
      const formData = {
        ...values,
        businessId: user?.id || 0
      };
      await createContractMutation.mutateAsync(formData);
      form.reset();
    } finally {
      setSubmitting(false);
    }
  }

  // Generate contract code
  const generateContractCode = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `SC-${year}-${month}-${random}`;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="contractName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="Website Redesign Project" {...field} className="bg-zinc-900 border-zinc-700 text-white" />
                </FormControl>
                <FormDescription className="text-zinc-400">
                  A descriptive name for the project
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contractCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Project Code</FormLabel>
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <Input {...field} className="bg-zinc-900 border-zinc-700 text-white" />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-white border-zinc-700 hover:bg-zinc-800"
                    onClick={() => form.setValue("contractCode", generateContractCode())}
                  >
                    Generate
                  </Button>
                </div>
                <FormDescription className="text-zinc-400">
                  A unique identifier for this project
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contractor selection removed from initial project creation.
        Sub contractors and freelancers can be added after project creation */}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the project scope and deliverables"
                  className="resize-none min-h-[100px] bg-zinc-900 border-zinc-700 text-white"
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
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
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white">
                    $
                  </span>
                  <FormControl>
                    <Input className="pl-7 bg-zinc-900 border-zinc-700 text-white" placeholder="5000" {...field} />
                  </FormControl>
                </div>
                <FormDescription className="text-zinc-400">Total project value in USD</FormDescription>
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
                        className={`w-full pl-3 text-left font-normal bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 ${
                          !field.value && "text-muted-foreground"
                        }`}
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("2020-01-01")}
                      initialFocus
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
                        className={`w-full pl-3 text-left font-normal bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 ${
                          !field.value && "text-muted-foreground"
                        }`}
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
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
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription className="text-zinc-400">
                The current status of this project
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => form.reset()} 
            className="border-zinc-700 text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={submitting || createContractMutation.isPending}
          >
            {(submitting || createContractMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Project
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ContractForm;