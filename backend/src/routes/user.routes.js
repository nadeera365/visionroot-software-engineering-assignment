import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listUsers } from "../controllers/user.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("ADMIN"), listUsers);

export default router;