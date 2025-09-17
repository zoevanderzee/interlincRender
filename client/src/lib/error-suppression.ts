
// Complete error suppression for UI library issues
export function suppressCommonErrors() {
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalInfo = console.info;

  // Completely block ResizeObserver errors
  console.error = (...args) => {
    const message = String(args[0] || '');
    if (
      message.includes('ResizeObserver loop') ||
      message.includes('ResizeObserver loop completed with undelivered notifications') ||
      message.includes('Non-Error promise rejection captured')
    ) {
      return; // Completely suppress
    }
    originalError(...args);
  };

  console.warn = (...args) => {
    const message = String(args[0] || '');
    if (message.includes('ResizeObserver loop')) {
      return; // Completely suppress
    }
    originalWarn(...args);
  };

  // Block "Runtime error: null" logs completely
  console.log = (...args) => {
    if (
      (args.length >= 2 && args[0] === 'Runtime error:' && args[1] === null) ||
      (args.length === 1 && typeof args[0] === 'object' && args[0]?.message === 'An uncaught exception occured but the error was not an error object.')
    ) {
      return; // Completely suppress
    }
    originalLog(...args);
  };

  console.info = (...args) => {
    const message = args[0];
    if (
      typeof message === 'object' && 
      message?.message === 'An uncaught exception occured but the error was not an error object.'
    ) {
      return; // Completely suppress
    }
    originalInfo(...args);
  };

  // Block unhandled promise rejections that are null
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason === null || 
      event.reason === undefined || 
      event.reason === '' ||
      (typeof event.reason === 'string' && event.reason.trim() === '')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
  });

  // Block runtime errors that are null or ResizeObserver related
  window.addEventListener('error', (event) => {
    if (
      event.error === null || 
      event.error === undefined ||
      event.message === 'null' || 
      event.message === 'undefined' ||
      event.message === '' ||
      event.message === 'Script error.' ||
      event.message.includes('ResizeObserver loop') ||
      (typeof event.error === 'object' && event.error === null)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
  });

  // Override React's error logging completely for these specific cases
  const originalConsoleError = window.console.error;
  window.console.error = (...args) => {
    const firstArg = String(args[0] || '');
    if (
      firstArg.includes('ResizeObserver loop') ||
      (args[0] === 'Runtime error:' && args[1] === null) ||
      (typeof args[0] === 'object' && args[0]?.message === 'An uncaught exception occured but the error was not an error object.')
    ) {
      return; // Block completely
    }
    originalConsoleError(...args);
  };

  // Override any potential React error boundary logging
  const originalReactError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (
      message === 'null' ||
      error === null ||
      String(message).includes('ResizeObserver loop')
    ) {
      return true; // Prevent default error handling
    }
    if (originalReactError) {
      return originalReactError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
}
