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
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>
): Promise<Response> {
  try {
    const defaultHeaders: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
    
    // Add CSRF token to headers for non-GET requests if available
    if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      defaultHeaders['X-CSRF-Token'] = csrfToken;
    }
    
    const headers: Record<string, string> = { ...defaultHeaders, ...(customHeaders || {}) };
    
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Update CSRF token from response
    updateCsrfToken(res);

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
      const endpoint = queryKey[0] as string;
      const res = await fetch(endpoint, {
        credentials: "include",
      });

      // Update CSRF token from response
      updateCsrfToken(res);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
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
