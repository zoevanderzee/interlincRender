import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import Help from "@/pages/help";
import Layout from "@/components/layout/Layout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contracts" component={Contracts} />
        <Route path="/contracts/new" component={NewContract} />
        <Route path="/contract/:id" component={ContractDetail} />
        <Route path="/projects" component={Projects} />
        <Route path="/contractors" component={Contractors} />
        <Route path="/payments" component={Payments} />
        <Route path="/reports" component={Reports} />
        <Route path="/data-room" component={DataRoom} />
        <Route path="/compliance" component={Compliance} />
        <Route path="/settings" component={Settings} />
        <Route path="/help" component={Help} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
