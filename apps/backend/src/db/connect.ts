import mongoose from "mongoose";
import { MONGOURL } from "../lib/constants";

export async function dbConnect() {
  mongoose.set("strictQuery", false);
  mongoose.set("strictPopulate", false);
  mongoose.set("id", true);
  await mongoose.connect(MONGOURL);
}

export async function dbDisconnect() {
  await mongoose.disconnect();
}
