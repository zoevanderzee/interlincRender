import React, { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient, clearAuthCache } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Contracts from "@/pages/contracts";
import NewContract from "@/pages/new-contract";
import ContractDetail from "@/pages/contract-detail";
import Projects from "@/pages/projects";
import Contractors from "@/pages/contractors";
import Connections from "@/pages/connections";
import Payments from "@/pages/payments";
import Reports from "@/pages/reports";
import DataRoom from "@/pages/data-room";
import Compliance from "@/pages/compliance";
import Settings from "@/pages/settings";
import Subscribe from "@/pages/subscribe";
import Help from "@/pages/help";
import ContractorConnect from "@/pages/contractor-connect";
import ContractorRequests from "@/pages/contractor-requests";
import TestLogin from "@/pages/test-login";
import PaymentTest from "@/pages/payment-test";
import StripeDebug from "@/pages/stripe-debug";
import StripeTest from "@/pages/stripe-test";
import StripeTestV2 from "@/pages/stripe-test-v2";
import StripeTestSimple from "@/pages/stripe-test-simple";
import StripeCheckout from "@/pages/stripe-checkout";
import PaymentSimulator from "@/pages/payment-simulator";
import PayContractor from "@/pages/pay-contractor";
import Wallet from "@/pages/wallet";
import Layout from "@/components/layout/Layout";
import AuthPage from "@/pages/auth";
import VerifyEmailPage from "@/pages/verify-email";
import VerifyEmail from "@/pages/verify";
import VerifyEmailCallback from "@/pages/VerifyEmailCallback";
import ResetPasswordPage from "@/pages/reset-password";
import ContractorInvitePage from "@/pages/contractor-invite";
import { ConnectionRequestsNotification } from "@/components/notifications/ConnectionRequestsNotification";
// Use correct import path to match the file location
import WorkRequestRespond from "./pages/work-request-respond";
import ContractorOnboarding from "@/pages/contractor-onboarding";
import BusinessSetup from "@/pages/business-setup";

function Router() {
  console.log("Router rendering, current path:", window.location.pathname + window.location.search);
  
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/auth">
        <AuthPage />
      </Route>
      
      <Route path="/verify-email">
        <VerifyEmailPage />
      </Route>
      
      <Route path="/verify">
        <VerifyEmail />
      </Route>
      
      <Route path="/verify-email-callback">
        <VerifyEmailCallback />
      </Route>
      
      {/* Firebase verification URL handler - check root path for verification parameters */}
      <Route path="/">
        {() => {
          const urlParams = new URLSearchParams(window.location.search);
          const mode = urlParams.get('mode');
          const oobCode = urlParams.get('oobCode');
          
          // If this is a Firebase email verification link, handle it
          if (mode === 'verifyEmail' && oobCode) {
            return <VerifyEmailCallback />;
          }
          
          // Otherwise show normal protected route
          return (
            <ProtectedRoute path="/">
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          );
        }}
      </Route>
      
      <Route path="/reset-password">
        <ResetPasswordPage />
      </Route>
      
      <Route path="/test-login">
        <TestLogin />
      </Route>
      
      <Route path="/payment-test">
        <PaymentTest />
      </Route>
      
      <Route path="/stripe-debug">
        <StripeDebug />
      </Route>
      
      <Route path="/stripe-test">
        <StripeTest />
      </Route>
      
      <Route path="/stripe-test-v2">
        <StripeTestV2 />
      </Route>
      
      <Route path="/stripe-test-simple">
        <StripeTestSimple />
      </Route>
      
      <Route path="/stripe-checkout">
        <StripeCheckout />
      </Route>
      
      <Route path="/payment-simulator">
        <PaymentSimulator />
      </Route>
      
      <Route path="/work-requests/respond">
        <WorkRequestRespond />
      </Route>
      
      <Route path="/contractor-invite">
        <ContractorInvitePage />
      </Route>

      {/* This is handled above in the nested route */}
      
      <ProtectedRoute path="/contracts">
        <Layout>
          <Contracts />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/contracts/new">
        <Layout>
          <NewContract />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/contracts/:id/edit">
        <Layout>
          <NewContract />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/contract/:id">
        <Layout>
          <ContractDetail />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/projects">
        <Layout>
          <Projects />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/contractors">
        <Layout>
          <Contractors />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/connections">
        <Layout>
          <Connections />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/contractors/:id/connect">
        <Layout>
          <ContractorConnect />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/contractor-requests">
        <Layout>
          <ContractorRequests />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/payments">
        <Layout>
          <Payments />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/wallet">
        <Layout>
          <Wallet />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/pay-contractor/:contractorId?">
        <Layout>
          <PayContractor />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/reports">
        <Layout>
          <Reports />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/data-room">
        <Layout>
          <DataRoom />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/compliance">
        <Layout>
          <Compliance />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/settings">
        <Layout>
          <Settings />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/contractor-onboarding">
        <ContractorOnboarding />
      </ProtectedRoute>
      
      <ProtectedRoute path="/business-setup">
        <BusinessSetup />
      </ProtectedRoute>
      
      <ProtectedRoute path="/subscribe">
        <Layout>
          <Subscribe />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/help">
        <Layout>
          <Help />
        </Layout>
      </ProtectedRoute>
      
      <Route path="/demo-contractor" component={DemoContractor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DemoContractor() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-6 text-accent-500">🔧 Contractor Interface Demo</h1>
        <p className="text-zinc-400 mb-6">
          Switch to a test contractor account to see the contractor interface without creating a real account.
        </p>
        <p className="text-zinc-400 mb-8">
          <strong className="text-white">Test Contractor:</strong> Quick Test<br />
          This will show you the contractor dashboard, project assignments, and payment tracking.
        </p>
        
        <div className="space-y-3">
          <button 
            onClick={() => {
              // Store current user ID for restoration
              const currentUserId = localStorage.getItem('user_id');
              if (currentUserId) {
                localStorage.setItem('original_user_id', currentUserId);
              }
              
              // Switch to contractor user (ID 85)
              localStorage.setItem('user_id', '85');
              localStorage.removeItem('firebase_uid');
              
              alert('Switched to contractor view! Redirecting to dashboard...');
              window.location.href = '/';
            }}
            className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Switch to Contractor View
          </button>
          
          <button 
            onClick={() => {
              // Restore original user ID
              const originalUserId = localStorage.getItem('original_user_id');
              if (originalUserId) {
                localStorage.setItem('user_id', originalUserId);
                localStorage.removeItem('original_user_id');
              }
              
              alert('Switched back to business view! Redirecting to dashboard...');
              window.location.href = '/';
            }}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Switch Back to Business View
          </button>
        </div>
        
        <p className="text-zinc-500 text-sm mt-6 italic">
          This temporarily changes your session to demo the contractor interface. Your actual account remains unchanged.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <ConnectionRequestsNotification />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
