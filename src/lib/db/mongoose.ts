import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
   
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? {
  conn: null,
  promise: null,
};
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/devpet",
      {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      },
    ).then((connection) => {
      cached.conn = connection;
      return connection;
    }).catch((error) => {
      cached.promise = null;
      throw error;
    });
  }

  return cached.promise;
}

export default connectDB;
