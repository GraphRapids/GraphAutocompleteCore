import { describe, expect, it } from 'vitest';

import {
  buildYamlSuggestionInsertText,
  buildAutocompleteMetadata,
  buildAutocompleteRuntimeFromMeta,
  computeIndentBackspaceDeleteCount,
  createProfileCatalog,
  DEFAULT_AUTOCOMPLETE_SPEC,
  getYamlAutocompleteContext,
  getYamlAutocompleteSuggestions,
  INDENT_SIZE,
  inferYamlSection,
  isRootBoundaryEmptyLine,
  planYamlBackspaceKeyAction,
  planYamlEnterKeyAction,
  resolveAutocompleteMetadataCache,
  resolveCompletionCommandBehavior,
  resolveYamlAutocompleteAtPosition,
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

  it('builds collection-key insertion at nested boundary line using parent indent', () => {
    const text =
      'nodes:\n  - name: node-1\n    type: router\n  - name: subgraph\n    nodes:\n      - name: subnode-1\n      - name: subnode-2\n      ';
    const meta = buildAutocompleteMetadata(text);
    const runtime = buildAutocompleteRuntimeFromMeta(text, 8, 7, meta);
    const suggestions = getYamlAutocompleteSuggestions(runtime.context, {
      spec: DEFAULT_AUTOCOMPLETE_SPEC,
      itemContextKeys: runtime.itemContextKeys,
      canContinueItemContext: runtime.canContinueItemContext,
      entities: runtime.entities,
      rootSectionPresence: meta.rootSectionPresence,
    });

    const insertion = buildYamlSuggestionInsertText({
      context: runtime.context,
      suggestion: suggestions.find((item) => item === '  links'),
      spec: DEFAULT_AUTOCOMPLETE_SPEC,
      indentSize: INDENT_SIZE,
      lines: meta.lines,
      lineNumber: 8,
      currentLine: '      ',
    });

    expect(insertion.insertText).toBe('    links:\n      - from: ');
  });

  it('builds collection-key insertion under current item context when not on boundary', () => {
    const insertion = buildYamlSuggestionInsertText({
      context: { kind: 'itemKey', section: 'nodes', prefix: 'no' },
      suggestion: '  nodes',
      spec: DEFAULT_AUTOCOMPLETE_SPEC,
      indentSize: INDENT_SIZE,
      lines: ['nodes:', '  - name: node-1', '    no'],
      lineNumber: 3,
      currentLine: '    no',
    });

    expect(insertion.insertText).toBe('    nodes:\n      - name: ');
  });

  it('computes indentation-aware backspace delete count', () => {
    expect(computeIndentBackspaceDeleteCount('    ', 5, INDENT_SIZE)).toBe(2);
    expect(computeIndentBackspaceDeleteCount('      ', 7, INDENT_SIZE)).toBe(2);
    expect(computeIndentBackspaceDeleteCount('  text', 3, INDENT_SIZE)).toBe(0);
  });

  it('uses profile-driven node and link type catalogs', () => {
    const profileCatalog = createProfileCatalog({
      profileId: 'team-a',
      profileVersion: 3,
      checksum: 'abc',
      nodeTypes: ['Router', 'Gateway'],
      linkTypes: ['Directed', 'Association'],
    });

    const nodeSuggestions = getYamlAutocompleteSuggestions(
      { kind: 'nodeTypeValue', section: 'nodes', prefix: 'g' },
      { profileCatalog }
    );
    const linkSuggestions = getYamlAutocompleteSuggestions(
      { kind: 'linkTypeValue', section: 'links', prefix: 'a' },
      { profileCatalog }
    );

    expect(nodeSuggestions).toEqual(['gateway']);
    expect(linkSuggestions).toEqual(['association']);
  });

  it('respects explicit suggestion arrays over profile catalogs', () => {
    const profileCatalog = createProfileCatalog({
      profileId: 'team-a',
      profileVersion: 3,
      checksum: 'abc',
      nodeTypes: ['router'],
      linkTypes: ['directed'],
    });

    const nodeSuggestions = getYamlAutocompleteSuggestions(
      { kind: 'nodeTypeValue', section: 'nodes', prefix: '' },
      {
        profileCatalog,
        nodeTypeSuggestions: ['edge-device'],
      }
    );

    expect(nodeSuggestions).toEqual(['edge-device']);
  });

  it('resolves autocomplete for a position with runtime and suggestions', () => {
    const text = 'nodes:\n  - name: A\n    type: ro';
    const { meta } = resolveAutocompleteMetadataCache({
      text,
      version: 1,
    });

    const { runtime, suggestions } = resolveYamlAutocompleteAtPosition({
      text,
      lineNumber: 3,
      column: 13,
      meta,
      profileCatalog: createProfileCatalog({
        profileId: 'default',
        profileVersion: 1,
        checksum: 'abc',
        nodeTypes: ['router'],
      }),
    });

    expect(runtime.context).toEqual({ kind: 'nodeTypeValue', section: 'nodes', prefix: 'ro' });
    expect(suggestions).toEqual(['router']);
  });

  it('plans enter key transitions for link endpoint and label values', () => {
    const fromPlan = planYamlEnterKeyAction({
      text: 'links:\n  - from: A',
      lineNumber: 2,
      column: 12,
    });
    expect(fromPlan).toEqual({
      shouldHandle: true,
      editId: 'link-from-next-to',
      insertText: '\n    to: ',
      triggerSource: 'enter-next-to',
    });

    const toPlan = planYamlEnterKeyAction({
      text: 'links:\n  - from: A\n    to: B',
      lineNumber: 3,
      column: 10,
    });
    expect(toPlan).toEqual({
      shouldHandle: true,
      editId: 'link-to-next-step',
      insertText: '\n  ',
      triggerSource: 'enter-next-to',
    });

    const labelPlan = planYamlEnterKeyAction({
      text: 'links:\n  - from: A\n    to: B\n    label: hello',
      lineNumber: 4,
      column: 17,
    });
    expect(labelPlan).toEqual({
      shouldHandle: true,
      editId: 'link-label-next-step',
      insertText: '\n  ',
      triggerSource: 'enter-after-label',
    });
  });

  it('plans backspace handling for root-boundary and indentation deletes', () => {
    const rootPlan = planYamlBackspaceKeyAction({
      text: 'nodes:\n  - name: A\n',
      lineNumber: 3,
      column: 1,
    });
    expect(rootPlan).toEqual({
      shouldHandle: true,
      editId: 'root-boundary-backspace',
      deleteStartColumn: 1,
      deleteEndColumn: 1,
      triggerSource: 'backspace-root-boundary',
    });

    const indentPlan = planYamlBackspaceKeyAction({
      text: 'nodes:\n  - name: A\n    ',
      lineNumber: 3,
      column: 5,
    });
    expect(indentPlan).toEqual({
      shouldHandle: true,
      editId: 'indent-backspace',
      deleteStartColumn: 3,
      deleteEndColumn: 5,
      triggerSource: 'backspace',
    });
  });

  it('resolves completion command behavior for suggestion follow-ups', () => {
    const nodeTypeBehavior = resolveCompletionCommandBehavior(
      { kind: 'nodeTypeValue', section: 'nodes', prefix: 'ro' },
      'router'
    );
    expect(nodeTypeBehavior.shouldTriggerSuggest).toBe(true);
    expect(nodeTypeBehavior.title).toBe('Trigger Next Step Suggestions');

    const endpointBehavior = resolveCompletionCommandBehavior(
      { kind: 'endpointValue', section: 'links', endpoint: 'from', prefix: 'A' },
      ':'
    );
    expect(endpointBehavior.shouldTriggerSuggest).toBe(false);

    const keyBehavior = resolveCompletionCommandBehavior(
      { kind: 'itemKey', section: 'links', prefix: '' },
      '  from'
    );
    expect(keyBehavior.shouldTriggerSuggest).toBe(true);
    expect(keyBehavior.title).toBe('Trigger Endpoint Suggestions');
  });
});
