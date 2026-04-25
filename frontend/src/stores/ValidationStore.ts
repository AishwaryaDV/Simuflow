/**
 * ValidationStore.ts
 * Runs topology validation before simulation starts.
 * Holds the last report and controls modal/sheet visibility.
 */

import { makeObservable, observable, action } from 'mobx'
import { runValidation } from '../validation/validator'
import type { ValidationReport } from '../validation/validator'
import type { ValidationIssue } from '../validation/types'
import { graphStore } from './GraphStore'

class ValidationStore {
  report:           ValidationReport | null = null
  showErrorModal:   boolean = false
  showWarningSheet: boolean = false

  private _onProceed: (() => void) | null = null

  constructor() {
    makeObservable(this, {
      report:           observable,
      showErrorModal:   observable,
      showWarningSheet: observable,
      validate:         action,
      dismissErrors:    action,
      proceedWithWarnings: action,
      closeWarningSheet:   action,
      reset:            action,
    })
  }

  // ── Called from Toolbar play button ─────────────────────────────────────────

  validate(onProceed: () => void): void {
    this._onProceed = onProceed

    const ctx = {
      nodes: graphStore.nodes,
      edges: [...graphStore.edges.values()],
    }
    const report = runValidation(ctx)
    this.report = report

    if (report.hasErrors) {
      this.showErrorModal = true
      return
    }
    if (report.hasWarnings) {
      this.showWarningSheet = true
      return
    }
    // Clean — start immediately
    onProceed()
  }

  dismissErrors() {
    this.showErrorModal = false
  }

  proceedWithWarnings() {
    this.showWarningSheet = false
    this._onProceed?.()
  }

  closeWarningSheet() {
    this.showWarningSheet = false
  }

  /** Clear report when canvas is reset or a fresh session begins. */
  reset() {
    this.report          = null
    this.showErrorModal  = false
    this.showWarningSheet = false
    this._onProceed      = null
  }

  // ── Node-level helpers for canvas / config panel ─────────────────────────────

  nodeValidationSeverity(nodeId: string): 'error' | 'warning' | 'advisory' | null {
    if (!this.report) return null
    if (this.report.errors.some((i: ValidationIssue)    => i.affectedNodeIds.includes(nodeId))) return 'error'
    if (this.report.warnings.some((i: ValidationIssue)  => i.affectedNodeIds.includes(nodeId))) return 'warning'
    if (this.report.advisories.some((i: ValidationIssue) => i.affectedNodeIds.includes(nodeId))) return 'advisory'
    return null
  }

  nodeAdvisories(nodeId: string): ValidationIssue[] {
    return this.report?.advisories.filter((i: ValidationIssue) => i.affectedNodeIds.includes(nodeId)) ?? []
  }
}

export const validationStore = new ValidationStore()
