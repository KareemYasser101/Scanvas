import express from "express";
import { dbConnect, dbDisconnect } from "./db/connect";
import init from "./lib/util/init";
import router from "./routes";
import { initTrpcRouter } from "./trpc/initTrpcRoute";
import cors from "cors";

async function main() {
  const app = express();
  app.use(
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000", "https://scanvas-frontend-intorai.vercel.app"], // Your frontend URL
      credentials: true,
    })
  );
  // Add body parsing middleware
  // Increase the payload size limit (e.g., 50MB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  // await dbConnect();

  // await init();

  initTrpcRouter(app);

  app.use("/api", router);

  app.listen(process.env.PORT, () => {
    console.log(`API Listening on Port ${process.env.PORT}`);
  });
}

main().catch(async (e) => {
  console.log(e);
  await dbDisconnect();
});
