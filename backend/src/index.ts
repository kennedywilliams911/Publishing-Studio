import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { setupBackgroundJobs } from "./lib/jobs";

import authRoutes from "./routes/auth";
import adminArticlesRoutes from "./routes/admin-articles";
import adminProfileRoutes from "./routes/admin-profile";
import adminSettingsRoutes from "./routes/admin-settings";
import adminUploadRoutes from "./routes/admin-upload";
import adminTranscribeRoutes from "./routes/admin-transcribe";

import publicRoutes from "./routes/public";
import shareRoutes from "./routes/share";
import searchRoutes from "./routes/search";
import analyticsRoutes from "./routes/analytics";
import newsletterRoutes from "./routes/newsletter";
import commentsRoutes from "./routes/comments";
import seriesRoutes from "./routes/series";
import versionsRoutes from "./routes/versions";
import translationsRoutes from "./routes/translations";
import billingRoutes from "./routes/billing";
import superAdminRoutes from "./routes/super-admin";
import {
  requireAuth,
  requireActiveSubscription,
} from "./middleware/requireAuth";

const app = express();

const PORT = Number(process.env.PORT) || 4000;

// -----------------------------------------------------
// CORS
// -----------------------------------------------------

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// -----------------------------------------------------
// Middleware
// -----------------------------------------------------

app.use(cookieParser());

// Paystack requires the exact raw request body for webhook signature checks.
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

app.use(
  express.json({
    limit: "2mb",
  }),
);

// Temporary request logger.
// Keep this while debugging route mismatches.
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// -----------------------------------------------------
// Health check
// -----------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "pastor-articles-api",
  });
});

// -----------------------------------------------------
// Authentication
// -----------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/super-admin", superAdminRoutes);

// -----------------------------------------------------
// Admin
// -----------------------------------------------------

app.use("/api/admin", requireAuth, requireActiveSubscription);

app.use("/api/upload", adminUploadRoutes);

app.use("/api/admin/articles", adminArticlesRoutes);

app.use("/api/admin/profile", adminProfileRoutes);

app.use("/api/admin/settings", adminSettingsRoutes);

app.use("/api/admin/upload", adminUploadRoutes);

app.use("/api/admin/transcribe", adminTranscribeRoutes);

app.use("/api/admin/comments", commentsRoutes);

app.use("/api/admin/series", seriesRoutes);

app.use("/api/admin/newsletter", newsletterRoutes);

// Analytics routes
app.use("/api/admin", analyticsRoutes);

// Article versions
app.use("/api/admin/articles", versionsRoutes);

// -----------------------------------------------------
// Public
// -----------------------------------------------------

app.use("/api/public", publicRoutes);
app.use("/api/share", shareRoutes);

app.use("/api/public/search", searchRoutes);

app.use("/api/public/series", seriesRoutes);

// Public analytics
app.use("/api/public", analyticsRoutes);

// -----------------------------------------------------
// Sharing
// -----------------------------------------------------

app.use("/api/share", shareRoutes);

// -----------------------------------------------------
// Newsletter
// -----------------------------------------------------

app.use("/api/newsletter", newsletterRoutes);

// -----------------------------------------------------
// Comments
// -----------------------------------------------------

app.use("/api/articles", commentsRoutes);

// -----------------------------------------------------
// Translation
// -----------------------------------------------------

app.use("/api/translate", translationsRoutes);

app.use("/api/admin/profile", translationsRoutes);

// -----------------------------------------------------
// 404 fallback
// -----------------------------------------------------

app.use((req, res) => {
  console.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    error: "Not found.",
    path: req.originalUrl,
    method: req.method,
  });
});

// -----------------------------------------------------
// Centralized error handler
// -----------------------------------------------------

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);

    res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  },
);

// -----------------------------------------------------
// Start server
// -----------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pastor Articles API listening on 0.0.0.0:${PORT}`);

  setupBackgroundJobs();
  console.log("✓ Background jobs initialized");
});
