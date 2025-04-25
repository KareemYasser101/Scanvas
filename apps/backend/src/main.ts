import express from "express";
import { dbConnect, dbDisconnect } from "./db/connect";
import init from "./lib/util/init";
import router from "./routes";
import { initTrpcRouter } from "./trpc/initTrpcRoute";

async function main() {
  const app = express();

  await dbConnect();

  await init();

  initTrpcRouter(app);

  // app.use("/api", router);

  app.listen(process.env.PORT, () => {
    console.log(`API Listening on Port ${process.env.PORT}`);
  });
}

main().catch(async (e) => {
  console.log(e);
  await dbDisconnect();
});
