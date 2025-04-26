import { Express } from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./router/_app";
import { createContext } from "./context";

export function initTrpcRouter(app: Express) {
  app.use(
    "/api/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ path, error }) => {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error}`
        );
      },
    })
  );
}