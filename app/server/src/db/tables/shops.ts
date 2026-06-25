import { mysqlTable, serial, timestamp, varchar } from "drizzle-orm/mysql-core";

export const shops = mysqlTable("shops", {
  id: serial("id").primaryKey(),
  shopDomain: varchar("shop_domain", { length: 255 }).notNull().unique(),
  accessToken: varchar("access_token", { length: 255 }),
  scope: varchar("scope", { length: 500 }),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
