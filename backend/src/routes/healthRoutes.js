import { Router } from "express";
import mongoose from "mongoose";

const router = Router();
router.get("/", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected ? "Service Request API is running" : "Database is unavailable.",
  });
});
export default router;
