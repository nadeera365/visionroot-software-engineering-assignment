import { Router } from "express";
import { register, login, logout, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, emptyBodySchema } from "../validation/schemas.js";

export default function authRoutes(authLimiter) {
  const router = Router();
  router.post("/register", authLimiter, validate(registerSchema), register);
  router.post("/login", authLimiter, validate(loginSchema), login);
  router.post("/logout", requireAuth, validate(emptyBodySchema), logout);
  router.get("/me", requireAuth, me);
  return router;
}
