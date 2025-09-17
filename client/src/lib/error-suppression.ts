
// Suppress common errors that don't affect functionality
export function suppressCommonErrors() {
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalInfo = console.info;

  // Comprehensive ResizeObserver error suppression
  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('ResizeObserver loop') ||
       message.includes('ResizeObserver loop completed with undelivered notifications') ||
       message.includes('Non-Error promise rejection captured'))
    ) {
      return;
    }
    originalError(...args);
  };

  console.warn = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('ResizeObserver loop') ||
       message.includes('ResizeObserver loop completed with undelivered notifications'))
    ) {
      return;
    }
    originalWarn(...args);
  };

  // Suppress null runtime error logs
  console.log = (...args) => {
    if (args.length >= 2 && args[0] === 'Runtime error:' && args[1] === null) {
      return;
    }
    originalLog(...args);
  };

  console.info = (...args) => {
    const message = args[0];
    if (
      typeof message === 'object' && 
      message?.message === 'An uncaught exception occured but the error was not an error object.'
    ) {
      return;
    }
    originalInfo(...args);
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason === null || 
      event.reason === undefined || 
      event.reason === '' ||
      (typeof event.reason === 'string' && event.reason.trim() === '')
    ) {
      event.preventDefault();
      return;
    }
  });

  // Handle runtime errors
  window.addEventListener('error', (event) => {
    if (
      event.error === null || 
      event.error === undefined ||
      event.message === 'null' || 
      event.message === 'undefined' ||
      event.message === '' ||
      event.message === 'Script error.' ||
      (typeof event.error === 'object' && event.error === null) ||
      event.message.includes('ResizeObserver loop')
    ) {
      event.preventDefault();
      return;
    }
  });

  // Suppress React DevTools warnings in production
  if (import.meta.env.PROD) {
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const message = args[0];
      if (
        typeof message === 'string' && 
        (message.includes('React DevTools') ||
         message.includes('Download the React DevTools'))
      ) {
        return;
      }
      originalConsoleWarn(...args);
    };
  }
}
