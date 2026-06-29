import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFutureAiQuote } from "../src/aiSafetyRules.js";

const eligible = {
  aiCanSendFinalQuote: true,
  priceType: "Fixed",
  requiredInformationComplete: true,
  discountAmount: 0,
  siteVisitRequired: false,
  quoteAmount: 300,
  maxAutoQuoteAmount: 500,
  quoteType: "Retail",
  needBossApproval: false,
  unclearRequest: false,
};

test("future eligibility is pure and never sends anything", () => {
  assert.deepEqual(evaluateFutureAiQuote(eligible), {
    decision: "eligible_for_future_final_send",
    reasons: [],
    sendsAnything: false,
  });
});

for (const [field, value, reason] of [
  ["aiCanSendFinalQuote", false, "service_not_allowed"],
  ["priceType", "Variable", "price_not_fixed"],
  ["requiredInformationComplete", false, "required_information_incomplete"],
  ["discountAmount", 10, "discount_requested"],
  ["siteVisitRequired", true, "site_visit_required"],
  ["quoteAmount", 501, "amount_above_limit"],
  ["quoteType", "Project", "project_quote"],
  ["needBossApproval", true, "boss_approval_required"],
  ["unclearRequest", true, "unclear_request"],
]) {
  test(`future AI hands over when ${field} is unsafe`, () => {
    const result = evaluateFutureAiQuote({ ...eligible, [field]: value });
    assert.equal(result.decision, "draft_and_handover");
    assert.equal(result.sendsAnything, false);
    assert.ok(result.reasons.includes(reason));
  });
}
