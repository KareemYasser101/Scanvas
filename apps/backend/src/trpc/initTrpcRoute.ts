import { Express } from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./router/_app";

export function initTrpcRouter(app: Express) {
  app.use(
    "/api/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      onError:
        process.env.NODE_ENV === "development"
          ? ({ path, error }) => {
              console.error(
                `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
              );
            }
          : undefined,
    })
  );
}
