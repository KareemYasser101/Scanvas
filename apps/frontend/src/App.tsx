import React, { useState } from "react";
import { RouterProvider } from "react-router-dom";
import useRouter from "./router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "./api/trpc";
import { httpBatchLink, createTRPCClient, createTRPCProxyClient } from "@trpc/client";
import { AppRouter } from "../../backend/src/trpc/router/_app";


function App() {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  );
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Main />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
export const Main = () => {

  const router = useRouter();

  return (
    <div className="min-h-screen text-white bg-gray-900">
      <RouterProvider router={router} />
    </div>
  );
};

export default App;
