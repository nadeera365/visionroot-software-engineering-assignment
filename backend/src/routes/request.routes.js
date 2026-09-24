import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createRequest,
  listRequests,
  getRequestById,
  updateRequest,
  cancelRequest,
  updateStatus,
} from "../controllers/request.controller.js";

const router = Router();

// Every route below needs a logged-in USER or ADMIN.
router.use(requireAuth);

router.post("/", requireRole("USER"), createRequest);
router.get("/", listRequests); // both roles — controller filters internally
router.get("/:id", getRequestById); // both roles — controller checks ownership
router.put("/:id", requireRole("USER"), updateRequest);
router.delete("/:id", requireRole("USER"), cancelRequest);
router.patch("/:id/status", requireRole("ADMIN"), updateStatus);

export default router;
