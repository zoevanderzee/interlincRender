import { QueryClient, QueryFunction } from "@tanstack/react-query";

export interface ApiError extends Error {
  status: number;
  statusText: string;
  data?: any;
  isApiError: boolean;
}

export function createApiError(status: number, statusText: string, message: string, data?: any): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.statusText = statusText;
  error.data = data;
  error.isApiError = true;
  return error;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage: string;
    let errorData: any;
    
    try {
      // Try to parse as JSON first
      errorData = await res.json();
      errorMessage = errorData.message || errorData.error || res.statusText;
    } catch (e) {
      // Fall back to text if not JSON
      errorMessage = await res.text() || res.statusText;
    }
    
    throw createApiError(
      res.status,
      res.statusText,
      `${res.status}: ${errorMessage}`,
      errorData
    );
  }
}

// Store the latest CSRF token
let csrfToken: string | null = null;

// Update CSRF token from response headers
function updateCsrfToken(res: Response) {
  const newToken = res.headers.get('X-CSRF-Token');
  if (newToken) {
    csrfToken = newToken;
  }
}

export async function apiRequest(
  method: string = 'GET',
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>
): Promise<Response> {
  try {
    // Normalize method name to uppercase
    const normalizedMethod = method.toUpperCase();
    
    // Content-Type is only needed for methods with a body (POST, PUT, PATCH)
    const defaultHeaders: Record<string, string> = 
      data && ['POST', 'PUT', 'PATCH'].includes(normalizedMethod) 
        ? { "Content-Type": "application/json" } 
        : {};
    
    // Add CSRF token to headers for non-GET requests if available
    if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod)) {
      defaultHeaders['X-CSRF-Token'] = csrfToken;
    }
    
    // Session-based authentication - no need to manually add headers
    // The session cookie will be sent automatically with credentials: 'include'
    console.log('Authentication headers check:');
    console.log('user_id from localStorage:', localStorage.getItem('user_id'));
    console.log('firebase_uid from localStorage:', localStorage.getItem('firebase_uid'));
    
    // Note: Session authentication relies on cookies, not manual headers
    const hasCookies = document.cookie.includes('creativlinc.sid');
    console.log('Has session cookie:', hasCookies);
    
    const headers: Record<string, string> = { ...defaultHeaders, ...(customHeaders || {}) };
    
    // Make sure the URL is always lowercase to match server routes
    const normalizedUrl = url.toLowerCase();
    
    // Log the fetch request for debugging
    console.log(`API Request: ${normalizedMethod} ${normalizedUrl}`, { headers, hasCookies: document.cookie.length > 0 });
    
    // Only include body for methods that support it
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(normalizedMethod);
    
    const res = await fetch(normalizedUrl, {
      method: normalizedMethod,
      headers,
      body: hasBody && data ? JSON.stringify(data) : undefined,
      credentials: "include", // Always include credentials
      mode: 'cors', // Enable CORS for cross-origin requests
      cache: 'no-cache', // Disable caching to ensure fresh responses
    });

    // Update CSRF token from response
    updateCsrfToken(res);
    
    // Log the response status and headers
    console.log(`API Response: ${normalizedMethod} ${normalizedUrl}`, { 
      status: res.status, 
      setCookie: res.headers.get('set-cookie'),
      contentType: res.headers.get('content-type')
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if ((error as ApiError).isApiError) {
      throw error;
    }
    
    // Handle network errors or other non-API errors
    throw createApiError(
      0,
      "Network Error",
      `Failed to connect to server: ${(error as Error).message}`,
      null
    );
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const endpoint = (queryKey[0] as string).toLowerCase();
      console.log(`Fetching data from ${endpoint}`);
      
      // Add authentication headers - use the same logic as apiRequest
      const userId = localStorage.getItem('user_id');
      const firebaseUid = localStorage.getItem('firebase_uid');
      
      // Log the fetch request for debugging
      console.log(`Query Request: GET ${endpoint}`, { 
        hasCookies: document.cookie.length > 0,
        cookieString: document.cookie,
        hasUserInStorage: !!userId
      });
      
      // Use header-based authentication with localStorage
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      };
      
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      if (firebaseUid) {
        headers['X-Firebase-UID'] = firebaseUid;
      }
      
      const res = await fetch(endpoint, {
        method: 'GET',
        credentials: "include",
        headers,
        cache: 'no-cache' // Disable caching to ensure fresh responses
      });

      // Update CSRF token from response
      updateCsrfToken(res);
      
      // Log the response status and headers
      console.log(`Query Response: GET ${endpoint}`, { 
        status: res.status, 
        setCookie: res.headers.get('set-cookie'),
        contentType: res.headers.get('content-type')
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Auth check failed for ${endpoint}, returning null as requested`);
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Error fetching data from ${queryKey[0]}:`, error);
      
      if ((error as ApiError).isApiError) {
        throw error;
      }
      
      // Handle network errors or other non-API errors
      throw createApiError(
        0,
        "Network Error",
        `Failed to connect to server: ${(error as Error).message}`,
        null
      );
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetching when window is focused
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1, // Retry once to handle temporary network issues
      retryDelay: 1000, // Retry after 1 second
    },
    mutations: {
      retry: 1, // Retry once to handle temporary network issues
    },
  },
});

// Clear all cached data and force fresh authentication check
export function clearAuthCache() {
  console.log("Clearing all authentication caches and data");
  
  // Clear React Query cache
  queryClient.clear();
  queryClient.removeQueries();
  
  // Clear all browser storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear all cookies aggressively
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    // Clear for multiple domain variations
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname};`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.replit.app;`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.replit.dev;`;
  }
  
  // Clear IndexedDB
  if ('indexedDB' in window) {
    indexedDB.deleteDatabase('keyval-store');
    indexedDB.deleteDatabase('firebaseLocalStorageDb');
  }
  
  // Clear any cached user headers
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
  
  console.log("All authentication data cleared");
}
