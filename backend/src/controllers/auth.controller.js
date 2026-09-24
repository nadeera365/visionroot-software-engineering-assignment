import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../middleware/errorHandler.js";

const SALT_ROUNDS = 10;


export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are all required.", 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new AppError("This email is already registered.", 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    res.status(201).json({
      success: true,
      message: "Account created. You can now log in.",
      data: user, 
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !["USER", "ADMIN"].includes(role)) {
      throw new AppError(
        "Email, password, and a valid role (USER or ADMIN) are required.",
        400
      );
    }

    const Model = role === "ADMIN" ? Admin : User;
    const account = await Model.findOne({
      email: email.toLowerCase().trim(),
    }).select("+passwordHash +tokenVersion");

    const invalidCredentials = () =>
      new AppError("Invalid email or password.", 401);

    if (!account || !account.isActive) {
      throw invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(
      password,
      account.passwordHash
    );
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    const token = signToken({
      sub: account._id,
      role,
      tokenVersion: account.tokenVersion,
    });

    res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      data: {
        token,
        user: account, 
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const { id, role } = req.auth;
    const Model = role === "ADMIN" ? Admin : User;

    await Model.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
}
