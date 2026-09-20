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
import { officeContentRouter } from "./routes/office-content.route.js";
import { officeDiaryRouter } from "./routes/office-diary.route.js";
import { officeLibraryRouter } from "./routes/office-library.route.js";
import { officeRecordsRouter } from "./routes/office-records.route.js";
import { officeRouter } from "./routes/office.route.js";
import { portalCasesRouter } from "./routes/portal-cases.route.js";
import { portalRouter } from "./routes/portal.route.js";
import { siteRouter } from "./routes/site.route.js";

export function createApp(): Express {
  const app = express();

  // Only as many hops as the deployment actually has: every rate limit here
  // is keyed on req.ip, and an unconfigured or over-generous setting lets a
  // caller pick their own address.
  app.set("trust proxy", env.trustProxyHops);

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
  app.use("/api/office", officeRouter);
  app.use("/api/office", officeRecordsRouter);
  app.use("/api/office", officeContentRouter);
  app.use("/api/office", officeDiaryRouter);
  app.use("/api/office", officeLibraryRouter);
  app.use("/api/portal", portalRouter);
  app.use("/api/portal", portalCasesRouter);
  app.use("/api/site", siteRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
