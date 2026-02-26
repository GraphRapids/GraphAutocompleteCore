// src/core/graphAutocompleteCore.js
import YAML from "js-yaml";
var INDENT_SIZE = 2;
var FORBIDDEN_AUTOCOMPLETE_KEYS = /* @__PURE__ */ new Set(["id"]);
var ROOT_SECTION_ALIASES = /* @__PURE__ */ new Map([["edges", "links"]]);
var NODE_TYPE_SUGGESTIONS = [];
var LINK_TYPE_SUGGESTIONS = [];
var EMPTY_PROFILE_CATALOG = Object.freeze({
  schemaVersion: "v1",
  profileId: "",
  profileVersion: 0,
  checksum: "",
  nodeTypes: [],
  linkTypes: []
});
function normalizeCatalogValues(values = []) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of values) {
    const normalized = String(raw || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
function createProfileCatalog(input = {}) {
  return {
    schemaVersion: String(input.schemaVersion || "v1"),
    profileId: String(input.profileId || ""),
    profileVersion: Number.isFinite(input.profileVersion) ? Number(input.profileVersion) : 0,
    checksum: String(input.checksum || ""),
    nodeTypes: normalizeCatalogValues(input.nodeTypes),
    linkTypes: normalizeCatalogValues(input.linkTypes)
  };
}
var DEFAULT_AUTOCOMPLETE_SPEC = {
  rootSections: ["nodes", "links"],
  node: {
    orderedKeys: ["name", "type", "ports", "nodes", "links"],
    requiredKeys: ["name"],
    entryStartKey: "name"
  },
  link: {
    orderedKeys: ["from", "to", "label", "type"],
    requiredKeys: ["from", "to"],
    entryStartKey: "from"
  }
};
var KEY_DOCUMENTATION = {
  nodes: "Collection of graph nodes. Supports nested nodes and nested links.",
  links: "Collection of graph links/edges. Use from/to as node[:port] references.",
  name: "Display name for a node. Also used as a default endpoint identifier.",
  type: "Domain node/link type. Node types are schema-driven plus built-in defaults.",
  from: "Link source endpoint in node or node:port format.",
  to: "Link destination endpoint in node or node:port format.",
  label: "Optional display label for links.",
  ports: "Port definitions for node endpoints."
};
function createEmptyCompletionMetaCache() {
  return {
    version: null,
    text: "",
    meta: {
      lines: [""],
      entities: { nodeNames: [], portsByNode: /* @__PURE__ */ new Map() },
      rootSectionPresence: /* @__PURE__ */ new Set()
    }
  };
}
function lineIndent(line) {
  const match = String(line || "").match(/^(\s*)/);
  return match ? match[1].length : 0;
}
function previousNonEmptyLine(lines, startIndex) {
  for (let i = startIndex; i >= 0; i -= 1) {
    const line = lines[i] || "";
    if (!line.trim()) {
      continue;
    }
    return { line, index: i };
  }
  return null;
}
function rootContentBounds(lines) {
  let firstNonEmpty = -1;
  let lastNonEmpty = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (!(lines[i] || "").trim()) {
      continue;
    }
    if (firstNonEmpty < 0) {
      firstNonEmpty = i;
    }
    lastNonEmpty = i;
  }
  return { firstNonEmpty, lastNonEmpty };
}
function isRootBoundaryEmptyLine(lines, lineIndex) {
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return false;
  }
  if ((lines[lineIndex] || "").trim().length > 0) {
    return false;
  }
  const { firstNonEmpty, lastNonEmpty } = rootContentBounds(lines);
  if (firstNonEmpty < 0 || lastNonEmpty < 0) {
    return false;
  }
  return lineIndex < firstNonEmpty || lineIndex > lastNonEmpty;
}
function keyFromLine(line) {
  const match = String(line || "").trim().match(/^(?:-\s*)?([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
  return match ? match[1] : null;
}
function inferYamlSection(lines, lineIndex, indent) {
  for (let i = lineIndex; i >= 0; i -= 1) {
    const text = lines[i];
    const match = text.match(/^(\s*)(nodes|links|edges)\s*:\s*$/);
    if (!match) {
      continue;
    }
    const sectionIndent = match[1].length;
    if (sectionIndent < indent || i === lineIndex) {
      const normalizedSection = ROOT_SECTION_ALIASES.get(match[2]) || match[2];
      return { section: normalizedSection, sectionIndent };
    }
  }
  return { section: "root", sectionIndent: 0 };
}
function isContinuationLineAfterTerminalKey(lines, lineNumber, section, itemIndent) {
  const safeLineIndex = Math.max(0, lineNumber - 1);
  const currentLine = lines[safeLineIndex] || "";
  if (currentLine.trim().length > 0) {
    return false;
  }
  if (lineIndent(currentLine) <= itemIndent) {
    return false;
  }
  const previous = previousNonEmptyLine(lines, safeLineIndex - 1);
  if (!previous) {
    return false;
  }
  if (lineIndent(previous.line) < itemIndent) {
    return false;
  }
  const previousKey = keyFromLine(previous.line);
  if (!previousKey) {
    return false;
  }
  const terminalKey = section === "nodes" ? "type" : section === "links" ? "type" : null;
  return terminalKey === previousKey;
}
function getYamlAutocompleteContext(text, lineNumber, column) {
  const lines = text.split("\n");
  while (lineNumber > lines.length) {
    lines.push("");
  }
  const safeLineNumber = Math.max(1, Math.min(lineNumber, lines.length));
  const line = lines[safeLineNumber - 1] || "";
  const safeColumn = Math.max(1, Math.min(column, line.length + 1));
  const leftText = line.slice(0, safeColumn - 1);
  const trimmedLeft = leftText.trim();
  const indent = lineIndent(line);
  const sectionInfo = inferYamlSection(lines, safeLineNumber - 1, indent);
  const section = sectionInfo.section;
  const itemIndent = sectionInfo.sectionIndent + INDENT_SIZE;
  if (section === "root" && isRootBoundaryEmptyLine(lines, safeLineNumber - 1)) {
    return { kind: "rootItemKey", section: "root", prefix: "" };
  }
  if (section !== "root" && isContinuationLineAfterTerminalKey(lines, safeLineNumber, section, itemIndent)) {
    return { kind: "itemKey", section, prefix: "" };
  }
  const dashTypeMatch = trimmedLeft.match(/^-\s*type:\s*([a-zA-Z0-9_-]*)$/);
  const typeMatch = trimmedLeft.match(/^type:\s*([a-zA-Z0-9_-]*)$/);
  const typeValueMatch = dashTypeMatch || typeMatch;
  if (typeValueMatch && section === "nodes") {
    return { kind: "nodeTypeValue", section, prefix: typeValueMatch[1] || "" };
  }
  if (typeValueMatch && section === "links") {
    return { kind: "linkTypeValue", section, prefix: typeValueMatch[1] || "" };
  }
  const endpointMatch = trimmedLeft.match(/^(?:-\s*)?(from|to):\s*([^\s]*)$/);
  if (endpointMatch && section === "links") {
    return {
      kind: "endpointValue",
      section,
      endpoint: endpointMatch[1],
      prefix: endpointMatch[2] || ""
    };
  }
  const listKeyMatch = trimmedLeft.match(/^-\s*([a-zA-Z_][a-zA-Z0-9_-]*)?$/);
  if (section !== "root" && (listKeyMatch || indent <= itemIndent && (trimmedLeft === "" || /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(trimmedLeft)))) {
    return {
      kind: "itemKey",
      section,
      prefix: listKeyMatch ? listKeyMatch[1] || "" : trimmedLeft
    };
  }
  const keyMatch = trimmedLeft.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)?$/);
  if (keyMatch) {
    return {
      kind: section === "root" ? "rootKey" : "key",
      section,
      prefix: keyMatch[1] || ""
    };
  }
  return { kind: "none", section, prefix: "" };
}
function extractKeyFromLine(line) {
  const match = line.trimStart().match(/^(?:-\s*)?([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
  return match ? match[1] : null;
}
function collectCurrentObjectKeys(lines, lineIndex, section, endLineIndex = lines.length - 1) {
  if (section !== "nodes" && section !== "links") {
    return [];
  }
  let start = lineIndex;
  let objectIndent = null;
  for (let i = lineIndex; i >= 0; i -= 1) {
    const line = lines[i] || "";
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const indent = lineIndent(line);
    if (/^-\s*/.test(trimmed)) {
      start = i;
      objectIndent = indent;
      break;
    }
  }
  if (objectIndent === null) {
    return [];
  }
  const keys = [];
  for (let i = start; i <= endLineIndex && i < lines.length; i += 1) {
    const line = lines[i] || "";
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const indent = lineIndent(line);
    if (i > start && indent <= objectIndent && /^-\s*/.test(trimmed)) {
      break;
    }
    if (i > start && indent < objectIndent) {
      break;
    }
    if (indent > objectIndent + INDENT_SIZE) {
      continue;
    }
    const key = extractKeyFromLine(line);
    if (key) {
      keys.push(key);
    }
  }
  return [...new Set(keys)];
}
function findItemStartBackward(lines, lineIndex, section) {
  if (section !== "nodes" && section !== "links") {
    return -1;
  }
  for (let i = lineIndex; i >= 0; i -= 1) {
    const line = lines[i] || "";
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const indent = lineIndent(line);
    const sectionInfo = inferYamlSection(lines, i, indent);
    if (sectionInfo.section !== section) {
      continue;
    }
    if (/^-\s*/.test(trimmed)) {
      return i;
    }
  }
  return -1;
}
function collectItemContextInfo(lines, lineIndex, section) {
  const currentItemStart = findItemStartBackward(lines, lineIndex, section);
  if (currentItemStart < 0) {
    return { objectKeys: [], canContinue: false };
  }
  const currentItemKeys = collectCurrentObjectKeys(lines, currentItemStart, section, lineIndex);
  if (currentItemKeys.length > 0) {
    return { objectKeys: currentItemKeys, canContinue: true };
  }
  const currentLineTrimmed = (lines[currentItemStart] || "").trim();
  if (!/^-\s*$/.test(currentLineTrimmed)) {
    return { objectKeys: [], canContinue: false };
  }
  const previousItemStart = findItemStartBackward(lines, currentItemStart - 1, section);
  if (previousItemStart < 0) {
    return { objectKeys: [], canContinue: false };
  }
  return {
    objectKeys: collectCurrentObjectKeys(lines, previousItemStart, section, currentItemStart - 1),
    canContinue: true
  };
}
function collectOrderedKeys(sectionSpec) {
  const requiredKeys = Array.isArray(sectionSpec?.requiredKeys) ? sectionSpec.requiredKeys : [];
  const orderedKeys = Array.isArray(sectionSpec?.orderedKeys) ? sectionSpec.orderedKeys : [];
  const keys = [...requiredKeys, ...orderedKeys];
  return [
    ...new Set(
      keys.filter(
        (key) => typeof key === "string" && key.trim() && !FORBIDDEN_AUTOCOMPLETE_KEYS.has(String(key).trim())
      )
    )
  ];
}
function normalizeSectionPrefix(prefix) {
  return String(prefix || "").replace(/^-/, "").replace(/:$/, "").trim().toLowerCase();
}
function selectNextObjectKey(sectionSpec, usedKeys, prefix) {
  const orderedKeys = collectOrderedKeys(sectionSpec);
  const used = new Set(usedKeys || []);
  const available = orderedKeys.filter((key) => !used.has(key));
  const normalizedPrefix = normalizeSectionPrefix(prefix);
  if (!normalizedPrefix) {
    return available.length ? [available[0]] : [];
  }
  return available.filter((key) => key.toLowerCase().startsWith(normalizedPrefix)).slice(0, 1);
}
function sectionSpecFor(section, spec) {
  if (section === "nodes") {
    return spec?.node || DEFAULT_AUTOCOMPLETE_SPEC.node;
  }
  if (section === "links") {
    return spec?.link || DEFAULT_AUTOCOMPLETE_SPEC.link;
  }
  return null;
}
function endpointSuggestions(prefix, entities, endpoint) {
  const rawPrefix = String(prefix || "");
  const normalizedPrefix = rawPrefix.toLowerCase();
  const nodeNames = Array.isArray(entities?.nodeNames) ? entities.nodeNames : [];
  if (normalizedPrefix.includes(":")) {
    return [];
  }
  const hasExactNodeMatch = normalizedPrefix.length > 0 && nodeNames.some((name) => String(name).toLowerCase() === normalizedPrefix);
  if ((endpoint === "from" || endpoint === "to") && hasExactNodeMatch) {
    return [":"];
  }
  return nodeNames.filter((name) => String(name).toLowerCase().startsWith(normalizedPrefix));
}
function getYamlAutocompleteSuggestions(context, meta = {}) {
  const spec = meta.spec || DEFAULT_AUTOCOMPLETE_SPEC;
  const profileCatalog = createProfileCatalog(meta.profileCatalog || {});
  const nodeTypes = Array.isArray(meta.nodeTypeSuggestions) && meta.nodeTypeSuggestions.length ? normalizeCatalogValues(meta.nodeTypeSuggestions) : profileCatalog.nodeTypes.length ? profileCatalog.nodeTypes : NODE_TYPE_SUGGESTIONS;
  const linkTypes = Array.isArray(meta.linkTypeSuggestions) && meta.linkTypeSuggestions.length ? normalizeCatalogValues(meta.linkTypeSuggestions) : profileCatalog.linkTypes.length ? profileCatalog.linkTypes : LINK_TYPE_SUGGESTIONS;
  if (context.kind === "nodeTypeValue") {
    return nodeTypes.filter((item) => item.startsWith((context.prefix || "").toLowerCase()));
  }
  if (context.kind === "linkTypeValue") {
    return linkTypes.filter((item) => item.startsWith((context.prefix || "").toLowerCase()));
  }
  if (context.kind === "endpointValue") {
    return endpointSuggestions(context.prefix, meta.entities || { nodeNames: [], portsByNode: /* @__PURE__ */ new Map() }, context.endpoint);
  }
  if (context.kind === "rootKey") {
    const prefix = normalizeSectionPrefix(context.prefix);
    const present = meta.rootSectionPresence || /* @__PURE__ */ new Set();
    const rootSections = (spec.rootSections || DEFAULT_AUTOCOMPLETE_SPEC.rootSections).filter(
      (item) => !present.has(item) && item.toLowerCase().startsWith(prefix)
    );
    return rootSections;
  }
  if (context.kind === "rootItemKey") {
    const rootSections = (spec.rootSections || DEFAULT_AUTOCOMPLETE_SPEC.rootSections).map((item) => String(item || ""));
    const present = meta.rootSectionPresence || /* @__PURE__ */ new Set();
    return rootSections.filter((item) => item && !present.has(item)).map((item) => `- ${item}:`);
  }
  if (context.kind === "itemKey") {
    const sectionSpec = sectionSpecFor(context.section, spec);
    const itemContextKeys = Array.isArray(meta.itemContextKeys) ? meta.itemContextKeys : [];
    const canContinueItem = Boolean(meta.canContinueItemContext);
    const startKey = sectionSpec?.entryStartKey || (context.section === "nodes" ? "name" : "from");
    const normalizedPrefix = normalizeSectionPrefix(context.prefix);
    let continuationKeys = collectOrderedKeys(sectionSpec).filter((key) => key !== startKey);
    if (context.section === "nodes" && itemContextKeys.includes("type")) {
      continuationKeys = [];
    }
    continuationKeys = continuationKeys.filter((key) => !itemContextKeys.includes(key));
    const options = [{ label: `- ${startKey}`, key: startKey }];
    if (canContinueItem) {
      for (const key of continuationKeys) {
        options.push({ label: `  ${key}`, key });
      }
    }
    if (!normalizedPrefix) {
      return options.map((option) => option.label);
    }
    return options.filter((option) => option.key.toLowerCase().startsWith(normalizedPrefix)).map((option) => option.label);
  }
  if (context.kind === "key" && (context.section === "nodes" || context.section === "links")) {
    const sectionSpec = sectionSpecFor(context.section, spec);
    return selectNextObjectKey(sectionSpec, meta.objectKeys, context.prefix);
  }
  return [];
}
function computeIndentBackspaceDeleteCount(lineContent, column, indentSize = INDENT_SIZE) {
  const safeLineContent = String(lineContent || "");
  const caretIndex = Math.max(0, Math.min(column - 1, safeLineContent.length));
  const before = safeLineContent.slice(0, caretIndex);
  const after = safeLineContent.slice(caretIndex);
  if (!before || before.trim().length > 0 || after.trim().length > 0) {
    return 0;
  }
  const remainder = caretIndex % indentSize;
  return remainder === 0 ? Math.min(indentSize, caretIndex) : remainder;
}
function collectGraphEntitiesFromParsed(parsed) {
  const nodeNames = /* @__PURE__ */ new Set();
  const portsByNode = /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set();
  const pendingEndpoints = [];
  function parseEndpoint(endpoint) {
    if (typeof endpoint !== "string") {
      return null;
    }
    const [node, port] = endpoint.split(":");
    if (!node) {
      return null;
    }
    return { node, port: port || "" };
  }
  function visit(graphObj) {
    if (!graphObj || typeof graphObj !== "object") {
      return;
    }
    if (seen.has(graphObj)) {
      return;
    }
    seen.add(graphObj);
    const nodes = Array.isArray(graphObj.nodes) ? graphObj.nodes : [];
    const links = Array.isArray(graphObj.links) ? graphObj.links : Array.isArray(graphObj.edges) ? graphObj.edges : [];
    for (const node of nodes) {
      if (typeof node === "string") {
        nodeNames.add(node);
        continue;
      }
      if (!node || typeof node !== "object") {
        continue;
      }
      if (typeof node.name === "string") {
        nodeNames.add(node.name);
      }
      visit(node);
    }
    for (const link of links) {
      if (!link || typeof link !== "object") {
        continue;
      }
      pendingEndpoints.push(parseEndpoint(link.from), parseEndpoint(link.to));
    }
  }
  visit(parsed);
  for (const endpoint of pendingEndpoints) {
    if (!endpoint || !endpoint.node || !endpoint.port) {
      continue;
    }
    if (!nodeNames.has(endpoint.node)) {
      continue;
    }
    if (!portsByNode.has(endpoint.node)) {
      portsByNode.set(endpoint.node, /* @__PURE__ */ new Set());
    }
    portsByNode.get(endpoint.node).add(endpoint.port);
  }
  return {
    nodeNames: [...nodeNames].sort((a, b) => a.localeCompare(b)),
    portsByNode
  };
}
function collectRootSectionPresence(lines, parsed) {
  const present = /* @__PURE__ */ new Set();
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const key of Object.keys(parsed)) {
      const normalized = ROOT_SECTION_ALIASES.get(key) || key;
      if (normalized === "nodes" || normalized === "links") {
        present.add(normalized);
      }
    }
  }
  if (present.size > 0) {
    return present;
  }
  for (const line of lines) {
    const match = line.match(/^(\s*)(nodes|links|edges)\s*:\s*$/);
    if (!match) {
      continue;
    }
    if ((match[1] || "").length !== 0) {
      continue;
    }
    const normalized = ROOT_SECTION_ALIASES.get(match[2]) || match[2];
    if (normalized === "nodes" || normalized === "links") {
      present.add(normalized);
    }
  }
  return present;
}
function buildAutocompleteMetadata(text) {
  const lines = text.split("\n");
  let entities = { nodeNames: [], portsByNode: /* @__PURE__ */ new Map() };
  let rootSectionPresence = collectRootSectionPresence(lines, null);
  try {
    const parsed = YAML.load(text);
    entities = collectGraphEntitiesFromParsed(parsed);
    rootSectionPresence = collectRootSectionPresence(lines, parsed);
  } catch (_err) {
  }
  return { lines, entities, rootSectionPresence };
}
function buildAutocompleteRuntimeFromMeta(text, lineNumber, column, meta) {
  const context = getYamlAutocompleteContext(text, lineNumber, column);
  const lineIndex = Math.max(0, Math.min(lineNumber - 1, meta.lines.length - 1));
  const itemContextInfo = context.kind === "itemKey" && (context.section === "nodes" || context.section === "links") ? collectItemContextInfo(meta.lines, lineIndex, context.section) : { objectKeys: [], canContinue: false };
  return {
    context,
    objectKeys: context.kind === "key" && (context.section === "nodes" || context.section === "links") ? collectCurrentObjectKeys(meta.lines, lineIndex, context.section, lineIndex) : [],
    itemContextKeys: itemContextInfo.objectKeys,
    canContinueItemContext: itemContextInfo.canContinue,
    entities: meta.entities
  };
}
function buildCompletionDocumentation(label) {
  return KEY_DOCUMENTATION[label] || "";
}
function markerFromDiagnostic(monaco, model, diagnostic) {
  const maxLine = typeof model.getLineCount === "function" ? model.getLineCount() : Number.POSITIVE_INFINITY;
  const startLineNumber = Math.max(1, Math.min(maxLine, diagnostic.lineNumber || 1));
  const endLineNumber = Math.max(startLineNumber, Math.min(maxLine, diagnostic.endLineNumber || startLineNumber));
  const lineText = typeof model.getLineContent === "function" ? model.getLineContent(startLineNumber) : "";
  const minEndColumn = Math.max(2, (diagnostic.column || 1) + 1);
  const startColumn = Math.max(1, diagnostic.column || 1);
  const endColumn = Math.max(minEndColumn, Math.min(lineText.length + 1 || minEndColumn, diagnostic.endColumn || minEndColumn));
  return {
    severity: diagnostic.severity === "warning" ? monaco.MarkerSeverity.Warning : diagnostic.severity === "info" ? monaco.MarkerSeverity.Info : monaco.MarkerSeverity.Error,
    message: diagnostic.message,
    source: diagnostic.source || "GraphAutocompleteCore",
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn
  };
}
export {
  DEFAULT_AUTOCOMPLETE_SPEC,
  EMPTY_PROFILE_CATALOG,
  INDENT_SIZE,
  LINK_TYPE_SUGGESTIONS,
  NODE_TYPE_SUGGESTIONS,
  buildAutocompleteMetadata,
  buildAutocompleteRuntimeFromMeta,
  buildCompletionDocumentation,
  collectRootSectionPresence,
  computeIndentBackspaceDeleteCount,
  createEmptyCompletionMetaCache,
  createProfileCatalog,
  getYamlAutocompleteContext,
  getYamlAutocompleteSuggestions,
  inferYamlSection,
  isRootBoundaryEmptyLine,
  lineIndent,
  markerFromDiagnostic,
  normalizeCatalogValues
};
//# sourceMappingURL=index.js.map
