import React, { useEffect, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient, clearAuthCache } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewProject from "@/pages/new-project";
import NewTask from "@/pages/new-task";
import NewContract from "@/pages/new-contract"; // Assuming this is the correct component to import
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
import InterlincConnect from "@/pages/InterlincConnect";
import ContractorInterlincConnect from "@/pages/ContractorInterlincConnect";
import InterlincConnectV2 from "@/pages/InterlincConnectV2";
import BudgetOversight from "@/pages/budget-oversight";
import Calendar from "@/pages/calendar";

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



import AssignContractor from "@/pages/assign-contractor";
import ProjectDetails from "@/pages/project-details";


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

          // If this is a Firebase password reset link, handle it
          if (mode === 'resetPassword' && oobCode) {
            return <ResetPasswordPage />;
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

      <ProtectedRoute path="/projects">
        <Layout>
          <Projects />
        </Layout>
      </ProtectedRoute>

      <ProtectedRoute path="/projects/new" component={NewProject} />
      <Route path="/tasks/new" component={NewTask} />
      <Route path="/projects/:id" component={ProjectDetails} />


      <ProtectedRoute path="/contractors">
        <Layout>
          <Contractors />
        </Layout>
      </ProtectedRoute>

      <ProtectedRoute path="/assign-contractor">
        <Layout>
          <AssignContractor />
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

      <ProtectedRoute path="/work-requests">
        <Layout>
          <ContractorRequests />
        </Layout>
      </ProtectedRoute>

      <ProtectedRoute path="/contractor-onboarding">
        <Layout>
          <ContractorOnboarding />
        </Layout>
      </ProtectedRoute>





      <ProtectedRoute path="/payments">
        <Layout>
          <Payments />
        </Layout>
      </ProtectedRoute>

      <ProtectedRoute path="/budget-oversight">
        <Layout>
          <BudgetOversight />
        </Layout>
      </ProtectedRoute>

      <ProtectedRoute path="/calendar">
        <Layout>
          <Calendar />
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

      <ProtectedRoute path="/interlinc-connect">
        <Layout>
          <InterlincConnectV2 />
        </Layout>
      </ProtectedRoute>

      <Route path="/interlinc-connect-v1" element={<InterlincConnect />} />
      
      <Route path="/stripe-test-v2" element={<StripeTestV2 />} />

      <ProtectedRoute path="/contractor-payment-setup">
        <Layout>
          <ContractorInterlincConnect />
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