import {
  mysqlEnum,
  mysqlTable,
  json,
  int,
  serial,
  timestamp,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

export const signalRecommendations = mysqlTable(
  "signal_recommendations",
  {
    id: serial("id").primaryKey(),
    shopId: int("shop_id").notNull(),
    ruleId: int("rule_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    recommendationType: mysqlEnum("recommendation_type", [
      "feature_on_homepage",
      "discount",
      "bundle",
      "restock",
      "watch_inventory",
      "archive_or_clearance",
    ]).notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high", "critical"])
      .default("medium")
      .notNull(),
    score: int("score").default(0).notNull(),
    reason: text("reason"),
    status: mysqlEnum("recommendation_status", [
      "open",
      "accepted",
      "dismissed",
    ])
      .default("open")
      .notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
);
