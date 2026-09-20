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

  /**
   * Security headers, including HSTS — real TLS termination happens at the
   * hosting platform; this just tells browsers to insist on it.
   *
   * `crossOriginResourcePolicy` is widened from helmet's `same-origin`
   * default because the website and this API are separate origins, and the
   * site legitimately embeds resources from here: blog covers in an `<img>`,
   * voice notes in an `<audio>`. Left at the default, every one of those is
   * refused by the browser with ERR_BLOCKED_BY_RESPONSE.NotSameOrigin — as
   * a blog cover was, until this was tested in a real browser rather than
   * with curl.
   *
   * It is safe here because CORP is not what protects anything: the
   * protected routes require a session, so a stranger's page embedding a
   * case document gets 401, and one trying to send credentials is refused
   * by the CORS allow-list. The public routes serve material the chamber
   * has deliberately published.
   */
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

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
