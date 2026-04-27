import { makeObservable, observable, action, computed } from 'mobx'
import type {
  SimulationFrame,
  MetricSnapshot,
  NodeRuntimeState,
  EdgeFlowState,
} from '../types/topology'
import { SimulationStatus } from '../types/topology'

const EMPTY_METRICS: MetricSnapshot = {
  timestamp:    0,
  throughput:   0,
  p50LatencyMs: 0,
  p95LatencyMs: 0,
  p99LatencyMs: 0,
  errorRate:    0,
  totalRequests: 0,
}

class SimulationStore {
  status: SimulationStatus = SimulationStatus.Idle
  nodeStates: Map<string, NodeRuntimeState> = new Map()
  edgeFlows:  Map<string, EdgeFlowState>   = new Map()
  globalMetrics: MetricSnapshot = { ...EMPTY_METRICS }
  /** Rolling 60s window — capped at 600 snapshots (100ms interval) */
  metricsHistory: MetricSnapshot[] = []
  speed: 0.25 | 0.5 | 1 | 2 | 4 = 1
  tickCount: number = 0
  elapsedSeconds: number = 0

  private _elapsedTimer: ReturnType<typeof setInterval> | null = null

  /** Set by useWorkerBridge — null until the worker is mounted. */
  _bridge: {
    start:          () => void
    pause:          () => void
    resume:         () => void
    stop:           () => void
    setSpeed:       (s: number) => void
    activateChaos:  (scenario: import('../types/topology').ActiveScenario) => void
    deactivateChaos:(instanceId: string) => void
  } | null = null

  constructor() {
    makeObservable(this, {
      status:         observable,
      nodeStates:     observable,
      edgeFlows:      observable,
      globalMetrics:  observable,
      metricsHistory: observable,
      speed:          observable,
      tickCount:      observable,
      elapsedSeconds: observable,
      bottleneckNodes:    computed,
      systemHealthScore:  computed,
      hasErrors:          computed,
      isRunning:          computed,
      start:        action,
      pause:        action,
      resume:       action,
      stop:         action,
      reset:        action,
      setSpeed:     action,
      absorbFrame:  action,
      _tickElapsed: action,
    })
  }

  // ─── Computed ──────────────────────────────────────────────────────────────

  get bottleneckNodes(): string[] {
    return Array.from(this.nodeStates.entries())
      .filter(([, s]) => s.utilisationPct > 90)
      .map(([id]) => id)
  }

  /** 0–100 inverse of average utilisation across all nodes */
  get systemHealthScore(): number {
    if (this.nodeStates.size === 0) return 100
    const avg =
      Array.from(this.nodeStates.values())
        .reduce((sum, s) => sum + s.utilisationPct, 0) / this.nodeStates.size
    return Math.max(0, 100 - avg)
  }

  get hasErrors(): boolean {
    return this.globalMetrics.errorRate > 0
  }

  get isRunning(): boolean {
    return (
      this.status === SimulationStatus.Running ||
      this.status === SimulationStatus.Chaos
    )
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  start() {
    this._bridge?.start()
    this.status = SimulationStatus.Running
    this._startTimer()
  }

  pause() {
    this._bridge?.pause()
    this.status = SimulationStatus.Paused
    this._stopTimer()
  }

  resume() {
    this._bridge?.resume()
    this.status = SimulationStatus.Running
    this._startTimer()
  }

  stop() {
    this._bridge?.stop()
    this._stopTimer()
    this.status = SimulationStatus.Idle
    this.reset()
  }

  reset() {
    this.nodeStates.clear()
    this.edgeFlows.clear()
    this.metricsHistory = []
    this.tickCount      = 0
    this.elapsedSeconds = 0
    this.globalMetrics  = { ...EMPTY_METRICS }
  }

  setSpeed(speed: 0.25 | 0.5 | 1 | 2 | 4) {
    this.speed = speed
    this._bridge?.setSpeed(speed)
  }

  /**
   * Called by useWorkerBridge on every FRAME message.
   * Must always be wrapped in runInAction by the caller — or called here
   * inside an action (it already is via makeObservable).
   */
  absorbFrame(frame: SimulationFrame) {
    this.tickCount = frame.tickId

    for (const [id, state] of Object.entries(frame.nodeStates)) {
      this.nodeStates.set(id, state)
    }
    for (const [id, flow] of Object.entries(frame.edgeFlows)) {
      this.edgeFlows.set(id, flow)
    }

    this.globalMetrics = frame.globalMetrics

    this.metricsHistory.push(frame.globalMetrics)
    if (this.metricsHistory.length > 600) this.metricsHistory.shift()

    if (frame.chaosEvents.length > 0) {
      this.status = SimulationStatus.Chaos
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private _startTimer() {
    if (this._elapsedTimer) return
    this._elapsedTimer = setInterval(() => this._tickElapsed(), 1000)
  }

  private _stopTimer() {
    if (this._elapsedTimer) {
      clearInterval(this._elapsedTimer)
      this._elapsedTimer = null
    }
  }

  _tickElapsed() {
    this.elapsedSeconds += 1
  }
}

export const simulationStore = new SimulationStore()
