import mongoose from "mongoose";

mongoose.connection.on("error", (error) => {
  console.error(`MongoDB connection error (${error.name}).`);
});

export default async function connectDB() {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error("MONGODB_URI is missing. Set it in backend/.env.");
  }

  try {
    await mongoose.connect(uri);
  } catch (error) {
    throw new Error(
      `MongoDB connection failed (${error.name}). Check MONGODB_URI, database credentials, and Atlas Network Access.`
    );
  }

  console.log("MongoDB connected");
}