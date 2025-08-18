import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Download, 
  FileText, 
  DollarSign, 
  Receipt, 
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const DataRoom = () => {
  const { toast } = useToast();
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  
  // Export download mutations
  const downloadCompliance = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/data-room/export/all', {
        method: 'GET',
        headers: {
          'X-User-ID': localStorage.getItem('currentUserId') || '',
          'X-Firebase-UID': localStorage.getItem('firebaseUID') || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'compliance-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Your compliance data has been downloaded successfully"
      });
      setDownloadingType(null);
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "There was an error downloading your data",
        variant: "destructive"
      });
      setDownloadingType(null);
    }
  });

  const downloadInvoices = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/data-room/export/invoices', {
        method: 'GET',
        headers: {
          'X-User-ID': localStorage.getItem('currentUserId') || '',
          'X-Firebase-UID': localStorage.getItem('firebaseUID') || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'invoices.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Your invoice data has been downloaded successfully"
      });
      setDownloadingType(null);
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "There was an error downloading your invoices",
        variant: "destructive"
      });
      setDownloadingType(null);
    }
  });

  const downloadPayments = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/data-room/export/payments', {
        method: 'GET',
        headers: {
          'X-User-ID': localStorage.getItem('currentUserId') || '',
          'X-Firebase-UID': localStorage.getItem('firebaseUID') || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'payments.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Your payment data has been downloaded successfully"
      });
      setDownloadingType(null);
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "There was an error downloading your payment data",
        variant: "destructive"
      });
      setDownloadingType(null);
    }
  });

  const downloadCSV = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch(`/api/data-room/export/csv?type=${type}`, {
        method: 'GET',
        headers: {
          'X-User-ID': localStorage.getItem('currentUserId') || '',
          'X-Firebase-UID': localStorage.getItem('firebaseUID') || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `${type}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Your CSV file has been downloaded successfully"
      });
      setDownloadingType(null);
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "There was an error downloading your CSV file",
        variant: "destructive"
      });
      setDownloadingType(null);
    }
  });

  const handleDownload = (type: string, mutation: any, param?: string) => {
    setDownloadingType(type);
    if (param) {
      mutation.mutate(param);
    } else {
      mutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Room</h1>
          <p className="text-muted-foreground mt-2">
            Download your compliance data, invoices, and payment records for legal and accounting purposes
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Complete Compliance Export */}
        <Card className="relative">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle>Complete Compliance Data</CardTitle>
            </div>
            <CardDescription>
              Export all contracts, deliverables, and payment records in comprehensive JSON format for legal compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleDownload('compliance', downloadCompliance)}
              disabled={downloadingType === 'compliance'}
              className="w-full"
            >
              {downloadingType === 'compliance' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Compliance Data
                </>
              )}
            </Button>
            <div className="mt-3 text-xs text-muted-foreground">
              <Info className="inline h-3 w-3 mr-1" />
              JSON format - suitable for legal archiving
            </div>
          </CardContent>
        </Card>

        {/* Invoice Data Export */}
        <Card className="relative">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-green-600" />
              <CardTitle>Invoice Records</CardTitle>
            </div>
            <CardDescription>
              Download all invoice data with e-invoicing compliance formatting for accounting systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleDownload('invoices', downloadInvoices)}
              disabled={downloadingType === 'invoices'}
              className="w-full"
            >
              {downloadingType === 'invoices' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Invoices
                </>
              )}
            </Button>
            <div className="mt-3 text-xs text-muted-foreground">
              <Info className="inline h-3 w-3 mr-1" />
              UK e-invoicing compliant format
            </div>
          </CardContent>
        </Card>

        {/* Payment Records Export */}
        <Card className="relative">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <CardTitle>Payment Records</CardTitle>
            </div>
            <CardDescription>
              Export detailed payment history with transaction IDs and processor information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleDownload('payments', downloadPayments)}
              disabled={downloadingType === 'payments'}
              className="w-full"
            >
              {downloadingType === 'payments' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Payments
                </>
              )}
            </Button>
            <div className="mt-3 text-xs text-muted-foreground">
              <Info className="inline h-3 w-3 mr-1" />
              Includes Stripe & Trolley transaction data
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSV Export Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-orange-600" />
            <CardTitle>CSV Export Options</CardTitle>
          </div>
          <CardDescription>
            Download data in CSV format for spreadsheet applications and accounting software
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              variant="outline"
              onClick={() => handleDownload('csv-payments', downloadCSV, 'payments')}
              disabled={downloadingType === 'csv-payments'}
              className="w-full"
            >
              {downloadingType === 'csv-payments' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Payments CSV
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleDownload('csv-invoices', downloadCSV, 'invoices')}
              disabled={downloadingType === 'csv-invoices'}
              className="w-full"
            >
              {downloadingType === 'csv-invoices' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Invoices CSV
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleDownload('csv-compliance', downloadCSV, 'compliance')}
              disabled={downloadingType === 'csv-compliance'}
              className="w-full"
            >
              {downloadingType === 'csv-compliance' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Summary CSV
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900">Compliance & Legal Information</p>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• All exports include complete audit trails with timestamps and transaction IDs</p>
                <p>• Invoice data is formatted to UK e-invoicing standards for regulatory compliance</p>
                <p>• Payment records include both Stripe and Trolley transaction references</p>
                <p>• Data exports are filtered by your account access rights - you can only see your own data</p>
                <p>• CSV files are compatible with major accounting software including QuickBooks, Xero, and Sage</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataRoom;
