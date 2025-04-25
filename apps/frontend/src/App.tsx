import React from "react";
import { RouterProvider } from "react-router-dom";
import useRouter from "./router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "./api/trpc";
import { httpBatchLink } from "@trpc/client";

function App() {
  const [trpcClient] = React.useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "http://localhost:3000/api/trpc",
        }),
      ],
    })
  );
  const [queryClient] = React.useState(() => new QueryClient());
  
  
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
