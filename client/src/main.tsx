import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { PerformanceMonitor } from "@/lib/performance-monitor";
import { suppressCommonErrors } from "@/lib/error-suppression";

// Add error boundary for deployment debugging
window.addEventListener('error', (e) => {
  console.error('Runtime error:', e.error);
  document.body.innerHTML = `<div style="color: white; background: #1a1a1a; padding: 20px; font-family: Arial;">
    <h1>Deployment Error</h1>
    <p>Error: ${e.message}</p>
    <p>File: ${e.filename}</p>
    <p>Line: ${e.lineno}</p>
    <pre>${e.error?.stack || 'No stack trace'}</pre>
  </div>`;
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  // Initialize performance monitoring
  PerformanceMonitor.initialize();

  // Suppress common UI library errors that don't affect functionality
  suppressCommonErrors();

  const queryClient = new QueryClient({
  });

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `<div style="color: white; background: #1a1a1a; padding: 20px; font-family: Arial;">
    <h1>App Initialization Error</h1>
    <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
  </div>`;
}