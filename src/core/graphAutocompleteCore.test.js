import { describe, expect, it } from 'vitest';

import {
  buildAutocompleteMetadata,
  buildAutocompleteRuntimeFromMeta,
  computeIndentBackspaceDeleteCount,
  DEFAULT_AUTOCOMPLETE_SPEC,
  getYamlAutocompleteContext,
  getYamlAutocompleteSuggestions,
  INDENT_SIZE,
  inferYamlSection,
  isRootBoundaryEmptyLine,
} from './graphAutocompleteCore.js';

describe('graph autocomplete core', () => {
  it('detects root boundary empty lines', () => {
    const lines = ['nodes:', '  - name: A', ''];
    expect(isRootBoundaryEmptyLine(lines, 2)).toBe(true);
    expect(isRootBoundaryEmptyLine(lines, 1)).toBe(false);
  });

  it('infers nested section by indentation', () => {
    const lines = ['nodes:', '  - name: subgraph', '    nodes:', '      - name: n1'];
    const section = inferYamlSection(lines, 3, 6);
    expect(section).toEqual({ section: 'nodes', sectionIndent: 4 });
  });

  it('returns root suggestions for empty document', () => {
    const context = getYamlAutocompleteContext('', 1, 1);
    const suggestions = getYamlAutocompleteSuggestions(context, {
      spec: DEFAULT_AUTOCOMPLETE_SPEC,
      rootSectionPresence: new Set(),
    });
    expect(suggestions).toEqual(['nodes', 'links']);
  });

  it('returns endpoint suggestions from parsed node names', () => {
    const text = 'nodes:\n  - name: A\n  - name: B\nlinks:\n  - from: A\n    to: B';
    const meta = buildAutocompleteMetadata(text);
    const runtime = buildAutocompleteRuntimeFromMeta(text, 5, 12, meta);
    const suggestions = getYamlAutocompleteSuggestions(runtime.context, {
      entities: runtime.entities,
      rootSectionPresence: meta.rootSectionPresence,
      spec: DEFAULT_AUTOCOMPLETE_SPEC,
    });
    expect(suggestions).toEqual([':']);
  });

  it('returns next item-step suggestions after node name', () => {
    const text = 'nodes:\n  - name: node-1\n  ';
    const meta = buildAutocompleteMetadata(text);
    const runtime = buildAutocompleteRuntimeFromMeta(text, 3, 3, meta);
    const suggestions = getYamlAutocompleteSuggestions(runtime.context, {
      spec: DEFAULT_AUTOCOMPLETE_SPEC,
      itemContextKeys: runtime.itemContextKeys,
      canContinueItemContext: runtime.canContinueItemContext,
      entities: runtime.entities,
      rootSectionPresence: meta.rootSectionPresence,
    });
    expect(suggestions).toEqual(['- name', '  type', '  ports', '  nodes', '  links']);
  });

  it('computes indentation-aware backspace delete count', () => {
    expect(computeIndentBackspaceDeleteCount('    ', 5, INDENT_SIZE)).toBe(2);
    expect(computeIndentBackspaceDeleteCount('      ', 7, INDENT_SIZE)).toBe(2);
    expect(computeIndentBackspaceDeleteCount('  text', 3, INDENT_SIZE)).toBe(0);
  });
});
