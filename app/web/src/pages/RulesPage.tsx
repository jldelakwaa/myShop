import { useEffect, useState } from "react";
import { Banner, BlockStack, Button, Page } from "@shopify/polaris";

import { createRule, fetchRules, updateRule } from "../api/rules";
import { RuleForm } from "../components/rules/RuleForm";
import { RulePreview } from "../components/rules/RulePreview";
import { StatePanel } from "../components/StatePanel";
import {
  defaultRule,
  toRuleDraft,
  type RuleDraft,
  type RuleRecord,
} from "../types/rules";

type PageState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

export function RulesPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [rule, setRule] = useState<RuleDraft>(defaultRule);
  const [savedRule, setSavedRule] = useState<RuleRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function updateRuleDraft<K extends keyof RuleDraft>(
    key: K,
    value: RuleDraft[K],
  ) {
    setRule((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveRule() {
    setIsSaving(true);

    try {
      const result = savedRule
        ? await updateRule(savedRule.id, rule)
        : await createRule(rule);

      setSavedRule(result.rule);
      setRule(toRuleDraft(result.rule));
      setNotice(savedRule ? "Rule updated." : "Rule created.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Rule save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadRules() {
      try {
        const result = await fetchRules();
        const firstRule = result.rules[0];

        if (!isActive) {
          return;
        }

        if (firstRule) {
          setSavedRule(firstRule);
          setRule(toRuleDraft(firstRule));
        }

        setPageState({ status: "ready" });
      } catch (error) {
        if (isActive) {
          setPageState({
            status: "error",
            message:
              error instanceof Error ? error.message : "Rules request failed.",
          });
        }
      }
    }

    void loadRules();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <Page
      title="Signal rules"
      subtitle="Control how product recommendations are scored."
      primaryAction={
        <Button loading={isSaving} variant="primary" onClick={saveRule}>
          {savedRule ? "Update rule" : "Create rule"}
        </Button>
      }
    >
      {pageState.status === "loading" ? (
        <StatePanel isLoading title="Loading rules" />
      ) : null}

      {pageState.status === "error" ? (
        <StatePanel
          title="Rules unavailable"
          message={pageState.message}
          tone="critical"
        />
      ) : null}

      {pageState.status === "ready" ? (
        <BlockStack gap="400">
          {notice ? (
            <Banner onDismiss={() => setNotice(null)} tone="info">
              <p>{notice}</p>
            </Banner>
          ) : null}
          <RuleForm rule={rule} onChange={updateRuleDraft} />
          <RulePreview rule={savedRule} />
        </BlockStack>
      ) : null}
    </Page>
  );
}
