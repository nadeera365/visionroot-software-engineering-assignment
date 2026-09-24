import mongoose from "mongoose";
import bcrypt from "bcrypt";
import connectDB from "../src/config/db.js";
import Admin from "../src/models/Admin.js";
import { registerSchema } from "../src/validation/schemas.js";

async function seedAdmin() {
  const result = registerSchema.safeParse({
    name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
  });
  if (!result.success) throw new Error("Set valid ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD values in backend/.env.");
  await connectDB();
  await Admin.init();
  const { name, email, password } = result.data;
  if (await Admin.exists({ email })) {
    console.log("Admin already exists. Its credentials were not changed.");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.create({ name, email, passwordHash });
  console.log("Admin created. Log in using the Admin option and your local credentials.");
}

seedAdmin().catch((error) => {
  console.error(error.name === "Error" ? error.message : `Admin seed failed (${error.name}).`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
