/**
 * validation/types.ts
 * Shared types for the topology validation system.
 */

import type { SimNode, SimEdge } from '../types/topology'

export type ValidationSeverity = 'error' | 'warning' | 'advisory'

export interface ValidationIssue {
  /** Unique rule identifier — stable across runs, safe to key on. */
  ruleId:           string
  severity:         ValidationSeverity
  /** Short title shown in the modal / sheet header. */
  title:            string
  /** One-sentence explanation shown below the title. */
  message:          string
  /** Node IDs to highlight on the canvas (empty = topology-level issue). */
  affectedNodeIds:  string[]
}

export interface ValidationContext {
  nodes:  Map<string, SimNode>
  edges:  SimEdge[]
}

export interface ValidationRule {
  id:       string
  severity: ValidationSeverity
  /** Display name shown in lists and modals. */
  title:    string
  /**
   * Returns one ValidationIssue per problem found, or [] if the rule passes.
   * A single rule can return multiple issues (e.g. one per isolated node).
   */
  check: (ctx: ValidationContext) => ValidationIssue[]
}
