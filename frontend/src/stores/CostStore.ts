/**
 * CostStore — real-time cloud cost estimation.
 *
 * Cost model:
 *   totalRatePerHr = Σ nodes ( baseHrCost[nodeType] + rps/1M × perMillionReqCost[nodeType] )
 *
 * Spend accumulates per simulation tick. Each tick is a fixed 0.2 simulated
 * seconds and ticks fire `speed ×` faster in real time, so 4× speed = 4×
 * faster cost accumulation — matching "if this system ran for X simulated
 * hours, it would cost $Y".
 */

import { makeObservable, observable, computed, action, reaction } from "mobx";
import { NodeType, SimulationStatus } from "../types/topology";
import { simulationStore } from "./SimulationStore";
import { graphStore } from "./GraphStore";

// ── Cloud pricing tables ───────────────────────────────────────────────────────

/** Approximate $/hr to keep this node running (infra cost). AWS-based static table. */
export const BASE_HR: Partial<Record<NodeType, number>> = {
  [NodeType.Client]: 0,
  [NodeType.LoadBalancer]: 0.025, // AWS ALB base
  [NodeType.ApiServer]: 0.042, // t3.medium EC2
  [NodeType.Cache]: 0.068, // ElastiCache cache.t3.small
  [NodeType.Database]: 0.115, // RDS db.t3.medium
  [NodeType.Queue]: 0.001, // SQS (mostly request-priced)
  [NodeType.CDN]: 0.01, // CloudFront base
  [NodeType.Microservice]: 0.042,
  [NodeType.ApiGateway]: 0.035,
  [NodeType.Serverless]: 0, // pure pay-per-invocation
  [NodeType.Worker]: 0.021, // t3.small
  [NodeType.PubSub]: 0.002,
  [NodeType.Stream]: 0.015, // Kinesis per shard/hr
  [NodeType.RateLimiter]: 0,
  [NodeType.ObjectStore]: 0.023, // S3 simplified
  [NodeType.ExternalService]: 0,
  [NodeType.LLMGateway]: 0, // pure pay-per-token
  [NodeType.VectorDB]: 0.096, // Pinecone p1.x1
  [NodeType.AgentOrchestrator]: 0.5,
  [NodeType.DNS]: 0.008, // Route 53 hosted zone
  [NodeType.NoSQLStore]: 0.095, // DynamoDB on-demand base
  [NodeType.WAF]: 0.08, // AWS WAF WebACL base
  [NodeType.GraphDB]: 0.35, // Neptune db.r6g.large base
  [NodeType.ObservabilityMesh]: 0.05, // Datadog/OTel collector
  [NodeType.ToolRegistry]: 0.021, // t3.small service
  [NodeType.MemoryFabric]: 0.068, // ElastiCache cache.t3.small
};

/** Approximate $/million requests for request-priced services. */
const PER_MILLION_REQ: Partial<Record<NodeType, number>> = {
  [NodeType.LoadBalancer]: 0.008,
  [NodeType.Database]: 0.2,
  [NodeType.Queue]: 0.4, // SQS
  [NodeType.CDN]: 0.0085, // CloudFront
  [NodeType.ApiGateway]: 3.5, // API Gateway
  [NodeType.Serverless]: 0.2, // Lambda
  [NodeType.PubSub]: 0.5, // SNS
  [NodeType.ObjectStore]: 0.4, // S3 requests
  [NodeType.LLMGateway]: 30.0, // ~$0.03/1k tokens → rough req equiv
};

// Simulated seconds per tick (matches simulation.worker.ts TICK_SECS)
const TICK_REAL_SECS = 0.2;

// ── Store ─────────────────────────────────────────────────────────────────────

class CostStore {
  /** Cumulative $ spent since simulation started (simulated-time basis). */
  spentUsd = 0;
  /** User-configured budget cap in $. */
  budgetUsd = 10;
  /** Last tickId we processed (to avoid double-counting). */
  private _lastTick = -1;

  constructor() {
    makeObservable(this, {
      spentUsd: observable,
      budgetUsd: observable,
      setBudget: action,
      _accumulate: action,
      _reset: action,
      currentRatePerHr: computed,
      topCostNodes: computed,
      spentPct: computed,
      isOverBudget: computed,
    });

    // Accumulate on every new tick
    reaction(
      () => simulationStore.tickCount,
      () => this._accumulate(),
    );

    // Reset when simulation stops
    reaction(
      () => simulationStore.status,
      (status) => {
        if (status === SimulationStatus.Idle) this._reset();
      },
    );
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  /** Current $/hr based on active node types and their live RPS. */
  get currentRatePerHr(): number {
    let rate = 0;
    for (const node of graphStore.nodes.values()) {
      const baseHr = BASE_HR[node.nodeType] ?? 0;
      const perM = PER_MILLION_REQ[node.nodeType] ?? 0;
      const rps = simulationStore.nodeStates.get(node.id)?.currentRps ?? 0;
      rate += baseHr + ((rps * 3600) / 1_000_000) * perM;
    }
    return rate;
  }

  /** Top 3 nodes by cost contribution ($/hr), for the breakdown tooltip. */
  get topCostNodes(): { label: string; rateHr: number }[] {
    const items: { label: string; rateHr: number }[] = [];
    for (const node of graphStore.nodes.values()) {
      const baseHr = BASE_HR[node.nodeType] ?? 0;
      const perM = PER_MILLION_REQ[node.nodeType] ?? 0;
      const rps = simulationStore.nodeStates.get(node.id)?.currentRps ?? 0;
      const cost = baseHr + ((rps * 3600) / 1_000_000) * perM;
      if (cost > 0) items.push({ label: node.label, rateHr: cost });
    }
    return items.sort((a, b) => b.rateHr - a.rateHr).slice(0, 3);
  }

  get spentPct(): number {
    return Math.min(
      100,
      (this.spentUsd / Math.max(this.budgetUsd, 0.001)) * 100,
    );
  }

  get isOverBudget(): boolean {
    return this.spentUsd >= this.budgetUsd;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  setBudget(v: number) {
    this.budgetUsd = Math.max(0.01, v);
  }

  _accumulate() {
    const tick = simulationStore.tickCount;
    if (
      tick <= this._lastTick ||
      simulationStore.status === SimulationStatus.Idle
    )
      return;
    this._lastTick = tick;
    // Simulated hours elapsed this tick (speed is already reflected in the
    // tick rate — applying it here too would compound to speed²)
    const simHrs = TICK_REAL_SECS / 3600;
    this.spentUsd += this.currentRatePerHr * simHrs;
  }

  _reset() {
    this.spentUsd = 0;
    this._lastTick = -1;
  }
}

export const costStore = new CostStore();
