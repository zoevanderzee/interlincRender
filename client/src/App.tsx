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
import ResetPasswordPage from "@/pages/reset-password";
import ContractorInvitePage from "@/pages/contractor-invite";
import { ConnectionRequestsNotification } from "@/components/notifications/ConnectionRequestsNotification";
// Use correct import path to match the file location
import WorkRequestRespond from "./pages/work-request-respond";

function Router() {
  console.log("Router rendering, current path:", window.location.pathname + window.location.search);
  
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/auth">
        <AuthPage />
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

      {/* Protected Routes - require authentication */}
      <ProtectedRoute path="/">
        <Layout>
          <Dashboard />
        </Layout>
      </ProtectedRoute>
      
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
      
      <Route component={NotFound} />
    </Switch>
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
