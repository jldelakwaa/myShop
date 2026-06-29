import { AppProvider, Frame, Navigation } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { DashboardPage } from "./pages/DashboardPage";
import { RulesPage } from "./pages/RulesPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { ActivityPage } from "./pages/ActivityPage";

function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <BrowserRouter>
        <AppFrame />
      </BrowserRouter>
    </AppProvider>
  );
}

function AppFrame() {
  const location = useLocation();
  const search = location.search;

  return (
    <Frame
      navigation={
        <Navigation location={location.pathname}>
          <Navigation.Section
            items={[
              {
                label: "Dashboard",
                url: `/${search}`,
              },
              {
                label: "Rules",
                url: `/rules${search}`,
              },
              {
                label: "Recommendations",
                url: `/recommendations${search}`,
              },
              {
                label: "Activity",
                url: `/activity${search}`,
              },
            ]}
          />
        </Navigation>
      }
    >
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
      </Routes>
    </Frame>
  );
}

export default App;
