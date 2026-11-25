import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import connectDB from "../src/lib/db/mongoose";
import { Achievement, ACHIEVEMENT_DEFINITIONS } from "../src/lib/db/models/Achievement";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

async function seed() {
  try {
    await connectDB();
    await Achievement.init();
    await Achievement.bulkWrite(ACHIEVEMENT_DEFINITIONS.map((achievement) => ({
      updateOne: {
        filter: { key: achievement.key },
        update: { $set: achievement },
        upsert: true,
      },
    })));
    console.log(`Seeded ${ACHIEVEMENT_DEFINITIONS.length} achievements`);
  } catch (error) {
    console.error("Could not seed achievements:", error instanceof Error ? error.name : "Unknown error");
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void seed();
