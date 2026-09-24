import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import { checkOrigin, protectWrites, createLimiter } from "./middleware/security.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

// Tests create the same app without binding a fixed port.
export default function createApp(config) {
  const app = express();
  app.locals.config = config;
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.use(helmet());
  app.use("/api", createLimiter(config.apiRateLimit));
  app.use(checkOrigin);
  app.use(cors({
    origin: config.clientOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Requested-With"],
  }));
  app.use(protectWrites);
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes(createLimiter(config.authRateLimit, true)));
  app.use("/api/requests", requestRoutes);
  app.use("/api/users", userRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
