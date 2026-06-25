import { relations } from "drizzle-orm";

import { activityLogs } from "./activityLogs.js";
import { productMetrics } from "./productMetrics.js";
import { products } from "./products.js";
import { recommendationItems } from "./recommendationItems.js";
import { sessions } from "./sessions.js";
import { shops } from "./shops.js";
import { signalRecommendations } from "./signalRecommendations.js";
import { signalRules } from "./signalRules.js";

export const shopsRelations = relations(shops, ({ many }) => ({
  sessions: many(sessions),
  products: many(products),
  signalRules: many(signalRules),
  signalRecommendations: many(signalRecommendations),
  activityLogs: many(activityLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  shop: one(shops, {
    fields: [sessions.shopId],
    references: [shops.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  shop: one(shops, {
    fields: [products.shopId],
    references: [shops.id],
  }),
  metrics: many(productMetrics),
  recommendationItems: many(recommendationItems),
}));

export const productMetricsRelations = relations(productMetrics, ({ one }) => ({
  product: one(products, {
    fields: [productMetrics.productId],
    references: [products.id],
  }),
}));

export const signalRulesRelations = relations(signalRules, ({ one, many }) => ({
  shop: one(shops, {
    fields: [signalRules.shopId],
    references: [shops.id],
  }),
  recommendations: many(signalRecommendations),
}));

export const signalRecommendationsRelations = relations(
  signalRecommendations,
  ({ one, many }) => ({
    shop: one(shops, {
      fields: [signalRecommendations.shopId],
      references: [shops.id],
    }),
    rule: one(signalRules, {
      fields: [signalRecommendations.ruleId],
      references: [signalRules.id],
    }),
    items: many(recommendationItems),
  }),
);

export const recommendationItemsRelations = relations(
  recommendationItems,
  ({ one }) => ({
    recommendation: one(signalRecommendations, {
      fields: [recommendationItems.recommendationId],
      references: [signalRecommendations.id],
    }),
    product: one(products, {
      fields: [recommendationItems.productId],
      references: [products.id],
    }),
  }),
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  shop: one(shops, {
    fields: [activityLogs.shopId],
    references: [shops.id],
  }),
}));
