import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Contracts from "@/pages/contracts";
import NewContract from "@/pages/new-contract";
import ContractDetail from "@/pages/contract-detail";
import Projects from "@/pages/projects";
import Contractors from "@/pages/contractors";
import Payments from "@/pages/payments";
import Reports from "@/pages/reports";
import DataRoom from "@/pages/data-room";
import Compliance from "@/pages/compliance";
import Settings from "@/pages/settings";
import Subscribe from "@/pages/subscribe";
import Help from "@/pages/help";
import ContractorConnect from "@/pages/contractor-connect";
import TestLogin from "@/pages/test-login";
import Layout from "@/components/layout/Layout";
import AuthPage from "@/pages/auth";
import ResetPasswordPage from "@/pages/reset-password";

function Router() {
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
      
      <ProtectedRoute path="/contractors/:id/connect">
        <Layout>
          <ContractorConnect />
        </Layout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/payments">
        <Layout>
          <Payments />
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
