export type RecommendationPriority = "low" | "medium" | "high" | "critical";

export type RecommendationStatus = "open" | "accepted" | "dismissed";

export type Recommendation = {
  id: number;
  title: string;
  recommendationType: string;
  priority: RecommendationPriority;
  score: number;
  reason: string | null;
  status: RecommendationStatus;
};

export type ActivityLog = {
  id: number;
  eventType: string;
  message: string;
  actorType: "merchant" | "system";
  createdAt: string;
};

export type DashboardData = {
  ok: true;
  shop: {
    id: number;
    shopDomain: string;
  };
  summary: {
    products: number;
    activeRules: number;
    lowStockCount: number;
    staleStockCount: number;
    openRecommendations: number;
  };
  recommendations: Recommendation[];
  recentActivity: ActivityLog[];
};

export type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: DashboardData }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };
