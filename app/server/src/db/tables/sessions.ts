import {
  mysqlTable,
  boolean,
  int,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    shopId: int("shop_id").notNull(),
    shopDomain: varchar("shop_domain", { length: 255 }).notNull(),
    state: varchar("state", { length: 255 }),
    isOnline: boolean("is_online").default(false).notNull(),
    scope: varchar("scope", { length: 500 }),
    accessToken: varchar("access_token", { length: 255 }),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    // Keeping the original uniqueIndex behaviour.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // drizzle-orm types infer the uniqueIndex return type.
    shopDomainIdx: uniqueIndex("sessions_id_shop_domain_idx").on(
      table.id,
      table.shopDomain,
    ),
  }),
);
