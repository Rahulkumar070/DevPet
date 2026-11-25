import connectDB from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";

export async function getExtensionUser(req: Request) {
  const token = req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return null;

  await connectDB();
  return User.findOne({ apiToken: token });
}
