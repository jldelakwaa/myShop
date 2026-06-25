import {
  mysqlEnum,
  mysqlTable,
  int,
  serial,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

export const activityLogs = mysqlTable("activity_logs", {
  id: serial("id").primaryKey(),
  shopId: int("shop_id").notNull(),
  actorType: mysqlEnum("actor_type", ["merchant", "system"])
    .default("system")
    .notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
