import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Admin from "../models/Admin.js";

const SALT_ROUNDS = 10;

async function seedAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in backend/.env before running this script."
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  await connectDB();

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log(`An admin with email "${email}" already exists — nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const admin = await Admin.create({ name, email, passwordHash });

  console.log("Admin account created:");
  console.log(`  email: ${admin.email}`);
  console.log(`  id:    ${admin._id}`);
}

seedAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
