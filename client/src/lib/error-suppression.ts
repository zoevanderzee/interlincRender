
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

  // Handle unhandled promise rejections that are null or undefined
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason === null || event.reason === undefined) {
      event.preventDefault();
      return;
    }
  });

  // Handle runtime errors that are null
  window.addEventListener('error', (event) => {
    if (event.error === null || event.message === 'null') {
      event.preventDefault();
      return;
    }
  });
}
