import {
  mysqlEnum,
  mysqlTable,
  int,
  serial,
  timestamp,
  text,
} from "drizzle-orm/mysql-core";

export const recommendationItems = mysqlTable("recommendation_items", {
  id: serial("id").primaryKey(),
  recommendationId: int("recommendation_id").notNull(),
  productId: int("product_id").notNull(),
  role: mysqlEnum("role", ["primary", "bundle_pair", "alternative"])
    .default("primary")
    .notNull(),
  productScore: int("product_score").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
