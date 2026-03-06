import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  const businessToken = localStorage.getItem("businessToken");
  if (businessToken && url.includes("/api/business/")) {
    headers["x-business-token"] = businessToken;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

function handleGlobal401(error: unknown) {
  if (error instanceof Error && error.message.startsWith("401:")) {
    const path = window.location.pathname;
    if (path.startsWith("/admin")) {
      window.location.href = "/admin";
    } else if (path.startsWith("/driver")) {
      window.location.href = "/driver";
    } else if (path.startsWith("/business")) {
      window.location.href = "/business/login";
    } else if (path === "/" || path.startsWith("/home") || path.startsWith("/passenger") || path.startsWith("/zamow") || path.startsWith("/uzupelnij")) {
      window.location.href = "/passenger";
    }
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.query.state.status === "error") {
    handleGlobal401(event.query.state.error);
  }
});
