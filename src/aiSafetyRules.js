export function evaluateFutureAiQuote(input) {
  const reasons = [];
  if (!input.aiCanSendFinalQuote) reasons.push("service_not_allowed");
  if (input.priceType !== "Fixed") reasons.push("price_not_fixed");
  if (!input.requiredInformationComplete) reasons.push("required_information_incomplete");
  if (Number(input.discountAmount ?? 0) !== 0) reasons.push("discount_requested");
  if (input.siteVisitRequired) reasons.push("site_visit_required");
  if (
    !Number.isFinite(input.quoteAmount)
    || !Number.isFinite(input.maxAutoQuoteAmount)
    || input.quoteAmount > input.maxAutoQuoteAmount
  ) reasons.push("amount_above_limit");
  if (input.quoteType === "Project") reasons.push("project_quote");
  if (input.needBossApproval) reasons.push("boss_approval_required");
  if (input.unclearRequest) reasons.push("unclear_request");

  return {
    decision: reasons.length === 0
      ? "eligible_for_future_final_send"
      : "draft_and_handover",
    reasons,
    sendsAnything: false,
  };
}
