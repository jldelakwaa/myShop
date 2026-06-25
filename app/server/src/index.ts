import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db/index.js";
import { shops } from "./db/schema.js";
import { activityRouter } from "./routes/activity.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { devRouter } from "./routes/dev.js";

const app = express();

const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.use("/api/activity", activityRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/dev", devRouter);

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

    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  },
);

// Start the server
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
