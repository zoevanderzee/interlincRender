
// Suppress common errors that don't affect functionality
export function suppressCommonErrors() {
  // Suppress ResizeObserver errors
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('ResizeObserver loop') ||
       args[0].includes('ResizeObserver loop completed with undelivered notifications'))
    ) {
      return;
    }
    originalError(...args);
  };

  // Suppress console.warn for ResizeObserver
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('ResizeObserver loop') ||
       args[0].includes('ResizeObserver loop completed with undelivered notifications'))
    ) {
      return;
    }
    originalWarn(...args);
  };

  // Handle unhandled promise rejections that are null or undefined
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason === null || event.reason === undefined || event.reason === '') {
      event.preventDefault();
      return;
    }
  });

  // Handle runtime errors that are null or undefined
  window.addEventListener('error', (event) => {
    if (
      event.error === null || 
      event.error === undefined ||
      event.message === 'null' || 
      event.message === 'undefined' ||
      event.message === '' ||
      (typeof event.error === 'object' && event.error === null)
    ) {
      event.preventDefault();
      return;
    }
  });

  // Handle React error boundary errors that might be null
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      (args[0].includes('Runtime error:') && args[1] === null)
    ) {
      return;
    }
    originalConsoleLog(...args);
  };
}
