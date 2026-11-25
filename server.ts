import { createServer } from "node:http";
import next from "next";
import { loadEnvConfig } from "@next/env";
import { Server as SocketIOServer } from "socket.io";
import { initSocketServer } from "./src/lib/socket/server";
import { initializeDailyReminderScheduler } from "./src/lib/background/dailyReminder";

async function main() {
  const dev = process.env.NODE_ENV !== "production";
  loadEnvConfig(process.cwd(), dev);
  const port = Number(process.env.PORT || 3000);
  const hostname = process.env.HOST || "0.0.0.0";
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => void handle(req, res));
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
      methods: ["GET", "POST"],
    },
  });

  initSocketServer(io);

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, hostname, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
  initializeDailyReminderScheduler();
  console.log(`> Ready on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
}

main().catch((error) => {
  console.error("DevPet failed to start:", error);
  process.exit(1);
});
