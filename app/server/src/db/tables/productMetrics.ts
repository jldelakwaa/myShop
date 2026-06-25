import {
  mysqlTable,
  int,
  decimal,
  serial,
  timestamp,
} from "drizzle-orm/mysql-core";

export const productMetrics = mysqlTable("product_metrics", {
  id: serial("id").primaryKey(),
  productId: int("product_id").notNull(),
  inventoryQuantity: int("inventory_quantity").default(0).notNull(),
  reorderPoint: int("reorder_point").default(10).notNull(),
  unitsSold30d: int("units_sold_30d").default(0).notNull(),
  views30d: int("views_30d").default(0).notNull(),
  conversionRate: decimal("conversion_rate", {
    precision: 6,
    scale: 4,
  })
    .default("0.0000")
    .notNull(),
  grossMargin: decimal("gross_margin", {
    precision: 6,
    scale: 4,
  })
    .default("0.0000")
    .notNull(),
  daysSinceLastSale: int("days_since_last_sale").default(0).notNull(),
  inventoryAgeDays: int("inventory_age_days").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
