import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db/index.js";
import { shops } from "./db/schema.js";
import { activityRouter } from "./routes/activity.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { devRouter } from "./routes/dev.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { rulesRouter } from "./routes/rules.js";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";

const app = express();

const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/api/activity", activityRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/dev", devRouter);
app.use("/api/products", productsRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/rules", rulesRouter);

// Root endpoint
app.get("/", (req, res) => {
  const shop = req.query.shop;

  if (typeof shop === "string") {
    res.redirect(`/auth?shop=${encodeURIComponent(shop)}`);
    return;
  }

  res.json({
    ok: true,
    service: "signal-shelf-api",
    message: "Use /auth?shop=your-store.myshopify.com to install the app.",
  });
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "signal-shelf-api",
  });
});

// Database health check endpoint
app.get("/db-health", async (_req, res, next) => {
  try {
    await db.select().from(shops).limit(1);

    res.json({
      ok: true,
      database: "connected",
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);

    const statusCode =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    res.status(statusCode).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  },
);

// Start the server
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
