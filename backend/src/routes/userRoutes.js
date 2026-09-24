import { Router } from "express";
import { listUsers, getUser, updateUserStatus } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate, validateId } from "../middleware/validate.js";
import { userListSchema, userStatusSchema } from "../validation/schemas.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));
router.get("/", validate(userListSchema, "query"), listUsers);
router.get("/:id", validateId, getUser);
router.patch("/:id/status", validateId, validate(userStatusSchema), updateUserStatus);
export default router;
