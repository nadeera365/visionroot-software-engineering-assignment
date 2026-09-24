import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxLength: 254,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    // The admin seed script will hash the password before saving it.
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ["ADMIN"],
      default: "ADMIN",
      immutable: true,
    },
    isActive: { type: Boolean, required: true, default: true },
    // Logout will increment this to invalidate earlier tokens.
    tokenVersion: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      select: false,
      validate: {
        validator: Number.isSafeInteger,
        message: "Token version must be an integer.",
      },
    },
  },
  { timestamps: true }
);

// Also hide internal fields when a document is converted to JSON.
adminSchema.set("toJSON", {
  transform(_document, result) {
    delete result.passwordHash;
    delete result.tokenVersion;
    delete result.__v;
    return result;
  },
});

export default mongoose.model("Admin", adminSchema, "admins");