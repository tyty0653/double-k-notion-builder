export const title = () => ({ type: "title" });
export const richText = () => ({ type: "rich_text" });
export const select = (...options) => ({ type: "select", options });
export const multiSelect = (...options) => ({ type: "multi_select", options });
export const relation = (target) => ({ type: "relation", target });
export const formula = (expression) => ({ type: "formula", expression });
export const property = (type) => ({ type });

export function text(content) {
  return [{ type: "text", text: { content: String(content ?? "") } }];
}

export function chunk(items, size = 100) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
