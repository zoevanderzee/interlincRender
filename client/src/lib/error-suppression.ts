

// Aggressive error suppression for ResizeObserver and null runtime errors
export function suppressCommonErrors() {
  // Define error patterns to suppress
  const suppressPatterns = [
    'ResizeObserver loop',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured'
  ];

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalInfo = console.info;

  // Function to check if message should be suppressed
  const shouldSuppress = (message: any): boolean => {
    const str = String(message || '');
    return suppressPatterns.some(pattern => str.includes(pattern));
  };

  // Override all console methods
  console.error = (...args) => {
    if (shouldSuppress(args[0]) || (args[0] === 'Runtime error:' && args[1] === null)) {
      return;
    }
    originalError(...args);
  };

  console.warn = (...args) => {
    if (shouldSuppress(args[0])) {
      return;
    }
    originalWarn(...args);
  };

  console.log = (...args) => {
    if (
      (args[0] === 'Runtime error:' && args[1] === null) ||
      shouldSuppress(args[0]) ||
      (typeof args[0] === 'object' && args[0]?.message === 'An uncaught exception occured but the error was not an error object.')
    ) {
      return;
    }
    originalLog(...args);
  };

  console.info = (...args) => {
    if (
      shouldSuppress(args[0]) ||
      (typeof args[0] === 'object' && args[0]?.message === 'An uncaught exception occured but the error was not an error object.')
    ) {
      return;
    }
    originalInfo(...args);
  };

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason === null ||
      event.reason === undefined ||
      shouldSuppress(event.reason) ||
      (typeof event.reason === 'string' && event.reason.trim() === '')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
  }, { capture: true });

  // Intercept window errors
  window.addEventListener('error', (event) => {
    if (
      event.error === null ||
      event.error === undefined ||
      event.message === 'null' ||
      event.message === 'undefined' ||
      event.message === '' ||
      event.message === 'Script error.' ||
      shouldSuppress(event.message) ||
      shouldSuppress(event.error)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
  }, { capture: true });

  // Override global error handler
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (
      message === 'null' ||
      error === null ||
      shouldSuppress(message) ||
      shouldSuppress(error)
    ) {
      return true; // Prevent default handling
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Override unhandled promise rejection handler
  const originalOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    if (
      event.reason === null ||
      event.reason === undefined ||
      shouldSuppress(event.reason)
    ) {
      event.preventDefault();
      return;
    }
    if (originalOnUnhandledRejection) {
      return originalOnUnhandledRejection.call(this, event);
    }
  };

  // Monkey patch ResizeObserver to prevent these errors entirely
  if (typeof window.ResizeObserver !== 'undefined') {
    const OriginalResizeObserver = window.ResizeObserver;
    
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        const wrappedCallback: ResizeObserverCallback = (...args) => {
          try {
            return callback(...args);
          } catch (error) {
            // Silently catch ResizeObserver callback errors
            if (shouldSuppress(error)) {
              return;
            }
            throw error;
          }
        };
        super(wrappedCallback);
      }
    };
  }

  // Final fallback: override any logging that might slip through
  setTimeout(() => {
    const allConsoleMethods = ['error', 'warn', 'log', 'info'] as const;
    
    allConsoleMethods.forEach(method => {
      const original = (console as any)[method];
      (console as any)[method] = (...args: any[]) => {
        if (
          shouldSuppress(args[0]) ||
          (args[0] === 'Runtime error:' && args[1] === null) ||
          (typeof args[0] === 'object' && args[0]?.message === 'An uncaught exception occured but the error was not an error object.')
        ) {
          return;
        }
        original(...args);
      };
    });
  }, 100);
}

