import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `<div style="color: white; background: #1a1a1a; padding: 20px; font-family: Arial;">
    <h1>App Initialization Error</h1>
    <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
  </div>`;
}
