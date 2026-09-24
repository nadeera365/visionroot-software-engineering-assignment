import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import ApiError from "../utils/ApiError.js";
import { COOKIE_NAME, JWT_OPTIONS, clearSessionCookie } from "../utils/session.js";

export async function requireAuth(req, res, next) {
  const config = req.app.locals.config;
  const token = req.cookies[COOKIE_NAME];
  let claims;
  try {
    claims = jwt.verify(token, config.jwtSecret, JWT_OPTIONS);
  } catch {
    clearSessionCookie(res, config);
    throw new ApiError(401, "Please log in to continue.");
  }
  if (!claims || typeof claims !== "object" || !["USER", "ADMIN"].includes(claims.role)
      || !mongoose.isObjectIdOrHexString(claims.sub) || !Number.isSafeInteger(claims.tokenVersion)) {
    throw new ApiError(401, "Please log in to continue.");
  }

  const Account = claims.role === "ADMIN" ? Admin : User;
  const account = await Account.findById(claims.sub).select("+tokenVersion");
  if (!account || !account.isActive || account.role !== claims.role || account.tokenVersion !== claims.tokenVersion) {
    clearSessionCookie(res, config);
    throw new ApiError(401, "Your session has ended. Please log in again.");
  }
  req.user = account;
  req.accountModel = Account;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) throw new ApiError(403, "You do not have permission to do this.");
    next();
  };
}
