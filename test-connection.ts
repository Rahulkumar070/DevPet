import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import connectDB from "./src/lib/db/mongoose";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

async function checkConnection() {
  try {
    const db = (await connectDB()).connection.db;
    if (!db) throw new Error("MongoDB connection has no database");
    await db.command({ ping: 1 });
    console.log("MongoDB connection OK");
  } catch (error) {
    console.error("MongoDB connection failed:", error instanceof Error ? error.name : "Unknown error");
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void checkConnection();
