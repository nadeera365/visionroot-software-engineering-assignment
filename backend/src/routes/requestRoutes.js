import { Router } from "express";
import { listRequests, createRequest, getRequest, editRequest, cancelRequest, updateStatus } from "../controllers/requestController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate, validateId } from "../middleware/validate.js";
import { requestListSchema, createRequestSchema, editRequestSchema, statusSchema, emptyBodySchema } from "../validation/schemas.js";

const router = Router();
router.use(requireAuth);
router.get("/", validate(requestListSchema, "query"), listRequests);
router.post("/", requireRole("USER"), validate(createRequestSchema), createRequest);
router.get("/:id", validateId, getRequest);
router.patch("/:id", requireRole("USER"), validateId, validate(editRequestSchema), editRequest);
router.delete("/:id", requireRole("USER"), validateId, validate(emptyBodySchema), cancelRequest);
router.patch("/:id/status", requireRole("ADMIN"), validateId, validate(statusSchema), updateStatus);
export default router;
