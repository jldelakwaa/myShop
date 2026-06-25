import {
  mysqlTable,
  boolean,
  int,
  serial,
  timestamp,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

export const signalRules = mysqlTable("signal_rules", {
  id: serial("id").primaryKey(),
  shopId: int("shop_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  inventoryRiskWeight: int("inventory_risk_weight").default(25).notNull(),
  staleStockWeight: int("stale_stock_weight").default(20).notNull(),
  sellThroughWeight: int("sell_through_weight").default(20).notNull(),
  marginWeight: int("margin_weight").default(15).notNull(),
  conversionWeight: int("conversion_weight").default(10).notNull(),
  manualPriorityWeight: int("manual_priority_weight").default(10).notNull(),
  lowStockThreshold: int("low_stock_threshold").default(10).notNull(),
  staleStockDays: int("stale_stock_days").default(60).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
