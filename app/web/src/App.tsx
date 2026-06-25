import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Recommendation = {
  id: number;
  title: string;
  recommendationType: string;
  priority: "low" | "medium" | "high" | "critical";
  score: number;
  reason: string | null;
  status: "open" | "accepted" | "dismissed";
};

type ActivityLog = {
  id: number;
  eventType: string;
  message: string;
  actorType: "merchant" | "system";
  createdAt: string;
};

type DashboardData = {
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

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: DashboardData }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

async function fetchDashboard() {
  const response = await fetch("/api/dashboard");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Dashboard request failed.");
  }

  return data as DashboardData;
}

function titleize(value: string) {
  return value.replaceAll("_", " ");
}

function App() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
  });
  const [isSeeding, setIsSeeding] = useState(false);

  async function loadDashboard() {
    setLoadState({ status: "loading" });

    try {
      const data = await fetchDashboard();
      setLoadState({ status: "ready", data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Dashboard request failed.";

      if (message.toLowerCase().includes("seed demo data")) {
        setLoadState({ status: "empty", message });
        return;
      }

      setLoadState({ status: "error", message });
    }
  }

  async function seedDemoData() {
    setIsSeeding(true);

    try {
      const response = await fetch("/api/dev/seed", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Seed request failed.");
      }

      await loadDashboard();
    } catch (error) {
      setLoadState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Seed request failed.",
      });
    } finally {
      setIsSeeding(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const content = useMemo(() => {
    if (loadState.status === "loading") {
      return <p className="muted">Loading dashboard...</p>;
    }

    if (loadState.status === "empty") {
      return (
        <section className="empty-state">
          <h2>No demo data yet</h2>
          <p>{loadState.message}</p>
          <button type="button" onClick={seedDemoData} disabled={isSeeding}>
            {isSeeding ? "Seeding..." : "Seed demo data"}
          </button>
        </section>
      );
    }

    if (loadState.status === "error") {
      return (
        <section className="empty-state error">
          <h2>Dashboard unavailable</h2>
          <p>{loadState.message}</p>
          <button type="button" onClick={loadDashboard}>
            Retry
          </button>
        </section>
      );
    }

    const { data } = loadState;

    return (
      <>
        <section className="summary-grid" aria-label="Dashboard summary">
          <Metric label="Products tracked" value={data.summary.products} />
          <Metric label="Active rules" value={data.summary.activeRules} />
          <Metric label="Low-stock risks" value={data.summary.lowStockCount} />
          <Metric label="Stale-stock risks" value={data.summary.staleStockCount} />
          <Metric
            label="Open recommendations"
            value={data.summary.openRecommendations}
          />
        </section>

        <main className="dashboard-grid">
          <section className="panel recommendations">
            <div className="panel-heading">
              <div>
                <h2>Top Signals</h2>
                <p>Ranked by merchandising urgency.</p>
              </div>
              <button type="button" onClick={loadDashboard}>
                Refresh
              </button>
            </div>

            <div className="recommendation-list">
              {data.recommendations.map((recommendation) => (
                <article className="recommendation" key={recommendation.id}>
                  <div>
                    <div className="recommendation-title">
                      <h3>{recommendation.title}</h3>
                      <span className={`priority ${recommendation.priority}`}>
                        {recommendation.priority}
                      </span>
                    </div>
                    <p>{recommendation.reason}</p>
                    <span className="type-label">
                      {titleize(recommendation.recommendationType)}
                    </span>
                  </div>
                  <strong>{recommendation.score}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Activity</h2>
                <p>Recent system and merchant events.</p>
              </div>
            </div>

            <ol className="activity-list">
              {data.recentActivity.map((activity) => (
                <li key={activity.id}>
                  <span>{titleize(activity.eventType)}</span>
                  <p>{activity.message}</p>
                </li>
              ))}
            </ol>
          </section>
        </main>
      </>
    );
  }, [isSeeding, loadState]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Signal Shelf</span>
          <h1>Merchandising signals for Lumen Loom</h1>
          <p>
            Spot low-stock risks, stale inventory, and products worth featuring
            before the next campaign.
          </p>
        </div>
        <button type="button" onClick={seedDemoData} disabled={isSeeding}>
          {isSeeding ? "Seeding..." : "Seed demo"}
        </button>
      </header>

      {content}
    </div>
  );
}

function Metric(props: { label: string; value: number }) {
  return (
    <article className="metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

export default App;
