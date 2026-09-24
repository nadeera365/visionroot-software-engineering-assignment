import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, logout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const authLimiter = rateLimit({
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", requireAuth, logout);

export default router;
