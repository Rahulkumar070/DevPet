"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [socketState, setSocketState] = useState<{ socket: Socket | null; connected: boolean }>({
    socket: null,
    connected: false,
  });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      // Clear socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketState({ socket: null, connected: false });
      }
      return;
    }

    // Don't reconnect if already connected with same user
    if (socketRef.current?.connected) {
      return;
    }

    // Connect to the socket server
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    
    const newSocket = io(socketUrl, {
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: process.env.NODE_ENV === "development" ? 3 : Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      // Join guild room if member
      if (session.user.guildId) {
        newSocket.emit("join:guild", session.user.guildId);
      }
      setSocketState({ socket: newSocket, connected: true });
    });
    
    newSocket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setSocketState(prev => ({ ...prev, connected: false }));
    });

    newSocket.on("connect_error", (error) => {
      if (process.env.NODE_ENV === "development") {
        // Socket.IO requires custom server.ts — expected to fail in next dev
        console.debug("[Socket] Not available in dev mode");
      } else {
        console.error("[Socket] Connection error:", error.message);
      }
    });

    return () => {
      console.log("[Socket] Cleanup - disconnecting");
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [session?.user?.id, session?.user?.guildId]);

  return (
    <SocketContext.Provider value={socketState}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  return useContext(SocketContext);
}
