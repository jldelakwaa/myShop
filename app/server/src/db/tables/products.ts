import {
  mysqlEnum,
  mysqlTable,
  serial,
  int,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const products = mysqlTable(
  "products",
  {
    id: serial("id").primaryKey(),
    shopId: int("shop_id").notNull(),
    shopifyProductId: varchar("shopify_product_id", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    handle: varchar("handle", { length: 255 }),
    vendor: varchar("vendor", { length: 255 }),
    productType: varchar("product_type", { length: 255 }),
    status: mysqlEnum("status", ["active", "draft", "archived"])
      .default("active")
      .notNull(),
    imageUrl: varchar("image_url", { length: 1000 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    shopProductIdx: uniqueIndex("products_shop_product_idx").on(
      table.shopId,
      table.shopifyProductId,
    ),
  }),
);
