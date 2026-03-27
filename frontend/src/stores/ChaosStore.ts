import { makeObservable, observable, action, computed } from 'mobx'
import { nanoid } from 'nanoid'
import type { ActiveScenario, ChaosEvent, ChaosScenarioDef } from '../types/topology'
import { ChaosScenarioId, NodeType } from '../types/topology'

const SCENARIO_CATALOGUE: ChaosScenarioDef[] = [
  {
    id:               ChaosScenarioId.DbFailover,
    name:             'Database Failover',
    tag:              'DB_FAILOVER',
    description:      'Primary database is killed mid-simulation. Traffic retries to a replica with added lag.',
    validTargetTypes: [NodeType.Database],
    requiresTarget:   true,
    requiresConfig:   false,
  },
  {
    id:               ChaosScenarioId.CacheStampede,
    name:             'Cache Stampede',
    tag:              'CACHE_STAMPEDE',
    description:      'Cache is cleared cold. All traffic that would have hit the cache hammers the database simultaneously.',
    validTargetTypes: [NodeType.Cache, NodeType.CDN],
    requiresTarget:   true,
    requiresConfig:   false,
  },
  {
    id:               ChaosScenarioId.NetPartition,
    name:             'Network Partition',
    tag:              'NET_PARTITION',
    description:      'A partition is inserted between two node groups. Requests crossing it fail silently.',
    validTargetTypes: [],
    requiresTarget:   true,
    requiresConfig:   false,
  },
  {
    id:               ChaosScenarioId.TrafficSpike,
    name:             'Traffic Spike',
    tag:              'TRAFFIC_SPIKE',
    description:      'Incoming traffic multiplied by a configurable factor. Shows which node saturates first.',
    validTargetTypes: [],
    requiresTarget:   false,
    requiresConfig:   true,
  },
  {
    id:               ChaosScenarioId.Cascade,
    name:             'Cascading Failure',
    tag:              'CASCADE',
    description:      'One node is stressed past capacity. Backpressure and retries propagate the failure upstream.',
    validTargetTypes: [NodeType.ApiServer, NodeType.Microservice, NodeType.Database],
    requiresTarget:   true,
    requiresConfig:   false,
  },
  {
    id:               ChaosScenarioId.SlowDependency,
    name:             'Slow Dependency',
    tag:              'SLOW_DEP',
    description:      "One node's latency spikes dramatically. Queue depths build upstream even though the node stays alive.",
    validTargetTypes: [NodeType.ApiServer, NodeType.Database, NodeType.Microservice, NodeType.Cache],
    requiresTarget:   true,
    requiresConfig:   true,
  },
]

class ChaosStore {
  activeScenarios:    Map<string, ActiveScenario> = new Map()
  scenarioLog:        ChaosEvent[]                = []
  availableScenarios: ChaosScenarioDef[]          = SCENARIO_CATALOGUE

  constructor() {
    makeObservable(this, {
      activeScenarios:    observable,
      scenarioLog:        observable,
      availableScenarios: observable,
      isChaosModeActive:  computed,
      affectedNodeIds:    computed,
      activateScenario:   action,
      deactivateScenario: action,
      resolveScenario:    action,
      clearAll:           action,
    })
  }

  // ─── Computed ──────────────────────────────────────────────────────────────

  get isChaosModeActive(): boolean {
    return this.activeScenarios.size > 0
  }

  get affectedNodeIds(): string[] {
    const ids = new Set<string>()
    for (const s of this.activeScenarios.values()) {
      for (const id of s.targetNodeIds) ids.add(id)
    }
    return Array.from(ids)
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  activateScenario(
    scenarioId: ChaosScenarioId,
    targetNodeIds: string[] = [],
    config: Record<string, unknown> = {},
  ): string {
    const instance: ActiveScenario = {
      id: nanoid(),
      scenarioId,
      targetNodeIds,
      config,
      activatedAt: Date.now(),
    }
    this.activeScenarios.set(instance.id, instance)
    this.scenarioLog.push({
      scenarioId,
      phase:           'activated',
      affectedNodeIds: targetNodeIds,
      timestamp:       Date.now(),
    })
    return instance.id
  }

  deactivateScenario(instanceId: string) {
    const s = this.activeScenarios.get(instanceId)
    if (!s) return
    this.activeScenarios.delete(instanceId)
    this.scenarioLog.push({
      scenarioId:      s.scenarioId,
      phase:           'resolved',
      affectedNodeIds: s.targetNodeIds,
      timestamp:       Date.now(),
    })
    // Keep log to last 20 events
    if (this.scenarioLog.length > 20) this.scenarioLog.shift()
  }

  resolveScenario(instanceId: string) {
    this.deactivateScenario(instanceId)
  }

  clearAll() {
    for (const id of this.activeScenarios.keys()) {
      this.deactivateScenario(id)
    }
  }
}

export const chaosStore = new ChaosStore()
