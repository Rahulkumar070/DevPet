import type { Server as SocketIOServer } from "socket.io";
import { getToken } from "next-auth/jwt";
import { isObjectIdOrHexString } from "mongoose";
import connectDB from "@/lib/db/mongoose";
import { Battle } from "@/lib/db/models/Battle";
import { User } from "@/lib/db/models/User";

// Use global to persist socket across hot reloads in development
// and share between custom server and API routes
const globalForSocket = globalThis as unknown as {
  socketIO: SocketIOServer | null;
};

export function getIO(): SocketIOServer | null {
  return globalForSocket.socketIO ?? null;
}

export function setIO(server: SocketIOServer): void {
  globalForSocket.socketIO = server;
}

export function initSocketServer(server: SocketIOServer): void {
  globalForSocket.socketIO = server;

  server.use(async (socket, next) => {
    try {
      const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
      if (!secret) return next(new Error("Unauthorized"));
      const req = { headers: new Headers({ cookie: socket.request.headers.cookie ?? "" }) };
      const token = (await getToken({ req, secret, secureCookie: true })) ??
        await getToken({ req, secret, secureCookie: false });
      if (typeof token?.userId !== "string" || !isObjectIdOrHexString(token.userId)) {
        return next(new Error("Unauthorized"));
      }
      socket.data.userId = token.userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  server.on("connection", (socket) => {
    const userId: string = socket.data.userId;
    void socket.join(`user:${userId}`);

    socket.on("join:guild", async (guildId: unknown) => {
      if (typeof guildId !== "string" || !isObjectIdOrHexString(guildId)) return;
      try {
        await connectDB();
        if (await User.exists({ _id: userId, guildId })) await socket.join(`guild:${guildId}`);
      } catch (error) {
        console.error("Could not join guild room:", error);
      }
    });

    socket.on("join:battle", async (battleId: unknown) => {
      if (typeof battleId !== "string" || !isObjectIdOrHexString(battleId)) return;
      try {
        await connectDB();
        const battle = await Battle.exists({
          _id: battleId,
          $or: [{ challengerId: userId }, { defenderId: userId }],
        });
        if (battle) await socket.join(`battle:${battleId}`);
      } catch (error) {
        console.error("Could not join battle room:", error);
      }
    });

    socket.on("leave:battle", (battleId: unknown) => {
      if (typeof battleId === "string") void socket.leave(`battle:${battleId}`);
    });
  });
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  const io = globalForSocket.socketIO;
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  } else {
    console.warn(`[Socket] Cannot emit ${event} - io is null`);
  }
}

export function emitToGuild(
  guildId: string,
  event: string,
  data: unknown,
): void {
  const io = globalForSocket.socketIO;
  if (io) {
    io.to(`guild:${guildId}`).emit(event, data);
  }
}

export function emitToBattle(
  battleId: string,
  event: string,
  data: unknown,
): void {
  const io = globalForSocket.socketIO;
  if (io) {
    io.to(`battle:${battleId}`).emit(event, data);
  }
}
