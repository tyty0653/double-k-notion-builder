export function preserveOriginalQuoteNumber(value) {
  return value == null ? "" : String(value);
}

function comparisonKey(value) {
  return preserveOriginalQuoteNumber(value).trim().toLocaleLowerCase("en");
}

export function classifyQuoteIds(values) {
  const counts = new Map();
  for (const value of values) {
    const key = comparisonKey(value);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return values.map((value) => {
    const original = preserveOriginalQuoteNumber(value);
    const key = comparisonKey(value);
    const status = !key
      ? "Missing Quote ID"
      : counts.get(key) > 1
        ? "Duplicate Quote ID"
        : "Valid";
    return { original, status };
  });
}

// Deliberately returns nothing: Double K staff enter the company's next official ID.
export function createQuoteId() {
  return undefined;
}
