import { useState, useEffect } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlaidLink } from './PlaidLink';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BankAccount {
  id: number;
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype: string | null;
  accountMask: string | null;
  institutionName: string | null;
  isDefault: boolean;
}

interface BankAccountSelectorProps {
  onAccountSelect?: (accountId: string) => void;
  selectedAccountId?: string;
  showAddButton?: boolean;
}

export function BankAccountSelector({
  onAccountSelect,
  selectedAccountId,
  showAddButton = true
}: BankAccountSelectorProps) {
  const { toast } = useToast();
  const [exchangeState, setExchangeState] = useState<{
    isProcessing: boolean;
    publicToken: string | null;
    metadata: any | null;
  }>({
    isProcessing: false,
    publicToken: null,
    metadata: null
  });

  // Query to fetch user's bank accounts
  const {
    data: bankAccounts = [],
    isLoading: isLoadingAccounts,
    isError: isAccountsError,
    refetch: refetchAccounts
  } = useQuery<BankAccount[]>({
    queryKey: ['/api/plaid/bank-accounts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/plaid/bank-accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch bank accounts');
      }
      return response.json();
    }
  });

  // Mutation to set a bank account as default
  const setDefaultAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await apiRequest(
        'POST', 
        `/api/plaid/bank-accounts/${accountId}/set-default`
      );
      if (!response.ok) {
        throw new Error('Failed to set default account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/bank-accounts'] });
      toast({
        title: 'Default account updated',
        description: 'Your default bank account has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Mutation to remove a bank account
  const removeAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await apiRequest(
        'DELETE', 
        `/api/plaid/bank-accounts/${accountId}`
      );
      if (!response.ok) {
        throw new Error('Failed to remove account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/bank-accounts'] });
      toast({
        title: 'Account removed',
        description: 'Your bank account has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Mutation to create a bank account
  const createBankAccountMutation = useMutation({
    mutationFn: async ({ publicToken, accountId, accountName }: { publicToken: string; accountId: string; accountName: string }) => {
      const response = await apiRequest(
        'POST', 
        '/api/plaid/exchange-token', 
        { publicToken, accountId, accountName }
      );
      if (!response.ok) {
        throw new Error('Failed to link bank account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/bank-accounts'] });
      toast({
        title: 'Bank account linked',
        description: 'Your bank account has been successfully linked.',
      });
      setExchangeState({
        isProcessing: false,
        publicToken: null,
        metadata: null
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setExchangeState({
        isProcessing: false,
        publicToken: null,
        metadata: null
      });
    }
  });

  // If we have metadata from Plaid Link, process it
  useEffect(() => {
    if (exchangeState.publicToken && exchangeState.metadata && !exchangeState.isProcessing) {
      setExchangeState(prev => ({ ...prev, isProcessing: true }));
      
      const accountId = exchangeState.metadata.account_id;
      const accountName = exchangeState.metadata.account.name;
      
      createBankAccountMutation.mutate({
        publicToken: exchangeState.publicToken,
        accountId,
        accountName
      });
    }
  }, [exchangeState, createBankAccountMutation]);

  // Handle Plaid Link success
  const handlePlaidSuccess = (publicToken: string, metadata: any) => {
    setExchangeState({
      isProcessing: false,
      publicToken,
      metadata
    });
  };

  // Handle account selection
  const handleAccountSelect = (accountId: string) => {
    if (onAccountSelect) {
      onAccountSelect(accountId);
    }
  };

  // Handle setting an account as default
  const handleSetDefault = (accountId: string) => {
    setDefaultAccountMutation.mutate(accountId);
  };

  // Handle removing an account
  const handleRemoveAccount = (accountId: string) => {
    if (confirm('Are you sure you want to remove this bank account?')) {
      removeAccountMutation.mutate(accountId);
    }
  };

  // If loading, show loading state
  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading bank accounts...</span>
      </div>
    );
  }

  // If error, show error state
  if (isAccountsError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
            Error Loading Bank Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>There was an error loading your bank accounts. Please try again later.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => refetchAccounts()} variant="outline">
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If no accounts and not showing add button, show empty state
  if (bankAccounts.length === 0 && !showAddButton) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Bank Accounts</CardTitle>
          <CardDescription>
            You don't have any bank accounts linked.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // If no accounts but showing add button, show empty state with add button
  if (bankAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link a Bank Account</CardTitle>
          <CardDescription>
            You don't have any bank accounts linked. Link one now to make payments.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <PlaidLink
            onSuccess={handlePlaidSuccess}
            buttonText="Connect Bank Account"
            variant="default"
            className="w-full"
          />
        </CardFooter>
      </Card>
    );
  }

  // If there are accounts, show account selector
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {selectedAccountId ? (
          // If an account is selected, show a detailed view
          <div className="space-y-2">
            <label className="text-sm font-medium">Selected Account</label>
            {bankAccounts.map(account => (
              account.accountId === selectedAccountId && (
                <Card key={account.accountId} className="border-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      {account.accountName}
                      {account.isDefault && <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Default</span>}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {account.institutionName || 'Bank'} •••• {account.accountMask || 'xxxx'}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2 flex justify-between">
                    {!account.isDefault && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleSetDefault(account.accountId)}
                        disabled={setDefaultAccountMutation.isPending}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive" 
                      onClick={() => handleRemoveAccount(account.accountId)}
                      disabled={removeAccountMutation.isPending}
                    >
                      Remove
                    </Button>
                  </CardFooter>
                </Card>
              )
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleAccountSelect('')}
              className="mt-2"
            >
              Change Account
            </Button>
          </div>
        ) : (
          // If no account is selected, show a dropdown
          <>
            <label className="text-sm font-medium">Select a Bank Account</label>
            <Select onValueChange={handleAccountSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(account => (
                  <SelectItem key={account.accountId} value={account.accountId}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {account.accountName}
                        <span className="text-xs text-muted-foreground ml-2">
                          •••• {account.accountMask || 'xxxx'}
                        </span>
                      </span>
                      {account.isDefault && <Check className="h-4 w-4 ml-2 text-primary" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {showAddButton && (
        <div className="pt-2">
          <PlaidLink
            onSuccess={handlePlaidSuccess}
            buttonText="Add Another Bank Account"
            variant="outline"
            className="w-full"
          />
          
          {(createBankAccountMutation.isPending || exchangeState.isProcessing) && (
            <div className="flex items-center justify-center mt-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              Processing your bank account...
            </div>
          )}
        </div>
      )}
    </div>
  );
}