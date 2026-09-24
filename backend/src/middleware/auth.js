import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid Authorization header.",
      });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    const Model = payload.role === "ADMIN" ? Admin : User;
    const account = await Model.findById(payload.sub).select(
      "+tokenVersion"
    );

    if (!account || !account.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account no longer available.",
      });
    }

    if (account.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Session has been invalidated. Please log in again.",
      });
    }

    req.auth = { id: account._id, role: payload.role };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to do this.",
      });
    }
    next();
  };
}