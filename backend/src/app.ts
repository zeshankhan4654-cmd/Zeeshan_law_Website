import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.route.js";
import { healthRouter } from "./routes/health.route.js";
import { libraryRouter } from "./routes/library.route.js";

export function createApp(): Express {
  const app = express();

  // Security headers, including HSTS — real TLS termination happens at the
  // hosting platform, this just tells browsers to insist on it.
  app.use(helmet());

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true, // lets the session cookie travel with cross-origin requests
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  if (!env.isProduction) {
    app.use(morgan("dev"));
  }

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/library", libraryRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
