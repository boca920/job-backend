import mongoose from "mongoose"; //just mongoose import!
import dotenv from "dotenv"
dotenv.config()

mongoose.set("bufferCommands", false);

// Reuse Mongo connection across serverless invocations
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const dbConnection = async () => {
  if (cached.conn) return cached.conn;

  if (!process.env.DB_URL) {
    throw new Error("DB_URL is missing in environment variables.");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.DB_URL, {
        dbName: "Job_Portal",
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 20000,
        family: 4,
      })
      .then((mongooseInstance) => {
        console.log("MongoDB Connected Successfully!");
        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

export default dbConnection;