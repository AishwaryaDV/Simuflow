/**
 * templates/index.ts
 * Registry of all SimuFlow templates, organised by category.
 * Templates with topology = null are "coming soon" placeholders.
 */

import type { TopologySchema } from '../types/topology'

import webApp          from '../presets/web_app.json'
import cachedWebApp    from '../presets/cached_web_app.json'
import urlShortener    from '../presets/url_shortener.json'
import socialFeed      from '../presets/social_feed.json'
import videoStreaming  from '../presets/video_streaming.json'
import rideSharing     from '../presets/ride_sharing.json'
import aiAgent         from '../presets/ai_agent.json'

export type TemplateCategory =
  | 'fundamentals'
  | 'distributed'
  | 'data'
  | 'ai'

export interface TemplateDetails {
  overview:    string
  components:  { name: string; role: string }[]
  watchFor:    string[]
  tryThis:     string
}

export interface Template {
  slug:        string
  name:        string
  description: string
  category:    TemplateCategory
  topology:    TopologySchema | null   // null = coming soon
  details:     TemplateDetails | null
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  fundamentals: 'Fundamentals',
  distributed:  'Distributed Systems',
  data:         'Data & Analytics',
  ai:           'AI & Agents',
}

export const TEMPLATES: Template[] = [
  // ── Fundamentals ─────────────────────────────────────────────────────────────
  {
    slug:        'blank',
    name:        'Blank Canvas',
    description: 'Start from scratch with a clean workspace.',
    category:    'fundamentals',
    topology:    null,
    details:     null,
  },
  {
    slug:        'web_app',
    name:        'Simple Web App',
    description: 'Client → Load Balancer → API Servers → Database. The classic 3-tier architecture.',
    category:    'fundamentals',
    topology:    webApp.topology as unknown as TopologySchema,
    details: {
      overview:
        'The 3-tier web application is the foundation of most internet services. ' +
        'Traffic from clients is distributed across multiple API servers by a load balancer, ' +
        'which all share a single database. The database is almost always the first bottleneck.',
      components: [
        { name: 'Web Client',     role: 'Generates 200 RPS of inbound traffic.' },
        { name: 'Load Balancer',  role: 'Round-robin distribution across two API servers. Capacity 10,000 RPS.' },
        { name: 'API Server ×2',  role: 'Each handles up to 1,000 RPS with 50ms base latency.' },
        { name: 'Database',       role: 'Shared write target. Capacity 500 RPS — the system ceiling.' },
      ],
      watchFor: [
        'Database utilisation — it saturates well before the API servers.',
        'Error rate spikes when DB hits 100% utilisation.',
        'Latency p99 climbing under load due to DB queue depth.',
      ],
      tryThis:
        'Increase the Client RPS to 600 and watch the database become the bottleneck. ' +
        'Then add a Cache node between the API servers and DB to see how read offloading changes the picture.',
    },
  },
  {
    slug:        'cached_web_app',
    name:        'Cached Web App',
    description: 'Adds a Redis-like cache layer between API servers and the database to absorb read load.',
    category:    'fundamentals',
    topology:    cachedWebApp.topology as unknown as TopologySchema,
    details: {
      overview:
        'By placing a fast in-memory cache between your API tier and the database, ' +
        'the majority of read traffic is absorbed before it ever reaches the DB. ' +
        'With an 80% hit rate, only 1 in 5 requests touches the database — ' +
        'extending its effective capacity by 5×.',
      components: [
        { name: 'Load Balancer',   role: 'Distributes traffic across two API servers.' },
        { name: 'API Server ×2',   role: '1,000 RPS each, forward all reads to the cache.' },
        { name: 'Redis Cache',     role: '80% hit rate, 5ms latency, 5,000 RPS capacity.' },
        { name: 'Postgres',        role: 'Only receives cache-miss traffic (~20% of total reads).' },
      ],
      watchFor: [
        'Cache utilisation stays low while DB load drops dramatically.',
        'What happens when you drop the hit rate to 0.3 — when does the DB bottleneck reappear?',
        'Total p50 latency is slightly higher than the plain web app due to the extra cache hop.',
      ],
      tryThis:
        'Set the cache hit rate to 0.0 to simulate a cold cache (e.g. after a deploy flush) ' +
        'and observe how quickly the database saturates. This is a Cache Stampede scenario.',
    },
  },

  // ── Distributed Systems ───────────────────────────────────────────────────────
  {
    slug:        'url_shortener',
    name:        'URL Shortener at Scale',
    description: 'High-throughput URL mapping with analytics pipeline and aggressive caching layers.',
    category:    'distributed',
    topology:    urlShortener.topology as unknown as TopologySchema,
    details: {
      overview:
        'A URL shortener is deceptively simple on the surface but reveals several classic distributed ' +
        'systems trade-offs at scale. Reads (redirects) vastly outnumber writes (URL creation), so the ' +
        'read path is optimised with an in-memory cache achieving ~92% hit rate. A dedicated Key ' +
        'Generation Service pre-computes short codes to avoid ID collisions under concurrent writes. ' +
        'Every redirect emits a click event into a stream for async analytics processing.',
      components: [
        { name: 'DNS (Route 53)',        role: '300s TTL — repeat lookups served from client cache, reducing resolver load.' },
        { name: 'CDN (CloudFront)',      role: '75% hit rate. Redirect responses (301) are cacheable — most repeat visits never reach the origin.' },
        { name: 'Load Balancer',        role: 'Distributes CDN cache misses across services. 50,000 RPS capacity.' },
        { name: 'API Gateway',          role: 'Routes GET /:code to the Redirect Service and POST /shorten to Key Gen.' },
        { name: 'Redirect Service',     role: 'Hot read path. 15,000 RPS capacity, looks up URL in the cache first.' },
        { name: 'Key Gen Service',      role: 'Write path only. Generates unique short codes and persists the mapping.' },
        { name: 'Hot URL Cache',        role: '92% hit rate on CDN misses, 1ms latency. Serves the vast majority of origin redirects.' },
        { name: 'URL Mappings (NoSQL)', role: 'Source of truth for all mappings. Separate read/write capacity with ×3 replication.' },
        { name: 'Click Events Stream',  role: 'Async fan-out. Decouples redirect latency from analytics writes.' },
        { name: 'Analytics Worker',     role: 'Aggregates click events (geo, referrer, device) and writes to the data lake.' },
        { name: 'Analytics Lake (S3)', role: 'Long-term analytics storage. Not in the hot path.' },
      ],
      watchFor: [
        'CDN absorbs 75% of traffic before it reaches the origin — the biggest single scaling lever.',
        'Hot URL Cache hit rate is the key lever for origin traffic — drop it to 0.3 and watch NoSQL saturate.',
        'Key Gen Service is intentionally low-throughput; at high write RPS it becomes the bottleneck.',
        'The analytics stream decouples click recording from redirect latency — worker backpressure does not affect p50.',
      ],
      tryThis:
        'Simulate a cache warm-up failure: set Redis hit rate to 0.1 (cold cache after a flush) ' +
        'and increase Client RPS to 1,000. Watch DynamoDB read utilisation spike to near 100% and ' +
        'observe how the system degrades. Then restore the hit rate to 0.92 to see recovery.',
    },
  },
  {
    slug:        'social_feed',
    name:        'Social Media Feed',
    description: 'Fan-out write pattern across microservices with multi-tier storage and async workers.',
    category:    'distributed',
    topology:    socialFeed.topology as unknown as TopologySchema,
    details: {
      overview:
        'Engineering a social feed requires solving the celebrity fan-out problem while maintaining ' +
        'a responsive, personalised timeline for millions of concurrent users. The architecture uses ' +
        'a hybrid fan-out model — push-on-write for regular users (post ID pushed to all follower feeds ' +
        'immediately), pull-on-read for celebrities (merged at query time to avoid writing to millions of rows). ' +
        'Every post flows through a Kafka-like activity bus, enabling fan-out workers, ML filters, and ' +
        'notification services to process in parallel without blocking the original post request.',
      components: [
        { name: 'WAF',                  role: 'Web Application Firewall — rate limits and filters malicious traffic before it reaches the API layer.' },
        { name: 'CDN',                  role: '80% hit rate on static assets (images, JS, CSS). Dynamic feed requests always reach origin.' },
        { name: 'Feed Service',         role: 'Serves personalised timelines. Reads from Redis cache first; falls back to Feed Store on miss.' },
        { name: 'Post Service',         role: 'Accepts new posts, writes to Feed Store, emits a post event to the Activity Bus.' },
        { name: 'Media Service',        role: 'Handles media uploads and retrieval. Writes metadata to NoSQL and raw assets to object store.' },
        { name: 'ML Discovery',         role: 'Personalisation and discovery ranking. Slowest service at 200ms — high concurrency makes it the read bottleneck.' },
        { name: 'Activity Bus',         role: 'Kafka-like stream. Decouples post writes from all downstream processing — fan-out, notifications, analytics.' },
        { name: 'Fan Out Worker',       role: 'Pushes post IDs to follower feed stores. The bottleneck during viral/celebrity posts.' },
        { name: 'Notification Service', role: 'Async push notifications to followers. Consumes from the activity bus independently.' },
        { name: 'Feed Cache (Redis)',   role: 'Stores top 200 posts per active user in memory. Sub-10ms reads. Only kept warm for users active in past 30 days.' },
        { name: 'Feed Store (NoSQL)',   role: 'Persistent feed storage. High write capacity to absorb fan-out. Replication factor ×3.' },
        { name: 'Media Metadata',       role: 'Post metadata, captions, tags — indexed for search and discovery.' },
        { name: 'Media Assets',         role: 'Raw media object store. Not in the hot read path — CDN absorbs repeat media requests.' },
      ],
      watchFor: [
        'Fan Out Worker queue depth — spikes when a high-follower account posts (celebrity problem).',
        'Feed Cache hit rate is the key read lever — drop to 0.3 to simulate a cold cache after deploy.',
        'ML Discovery saturates first on the read path — 200ms latency makes it the throughput ceiling.',
        'Activity Bus absorbs post bursts cleanly — worker backpressure never blocks the Post Service.',
        'Feed Store write utilisation climbs with fan-out volume — watch both read and write dimensions.',
      ],
      tryThis:
        'Simulate a viral moment: raise Client RPS to 2,000 and watch the Fan Out Worker queue depth ' +
        'climb as it struggles to push to follower feeds faster than posts arrive. Then drop Fan Out ' +
        'Worker throughput to 2,000 to model a degraded worker pool and observe how the queue grows unbounded.',
    },
  },
  {
    slug:        'video_streaming',
    name:        'Video Streaming Platform',
    description: 'Media delivery with distributed transcoding workers, multi-tier CDN offload and adaptive bitrate streaming.',
    category:    'distributed',
    topology:    videoStreaming.topology as unknown as TopologySchema,
    details: {
      overview:
        'Distributing petabytes of video globally requires solving two distinct engineering problems: ' +
        'the upload and transcoding pipeline (CPU-bound, async, fault-tolerant) and the streaming delivery ' +
        'path (latency-sensitive, massively concurrent, CDN-dominated). A 2-hour 4K film is broken into ' +
        '5-second segments and distributed across hundreds of parallel transcoding workers, producing both ' +
        'HLS and DASH manifests at every bitrate. The CDN absorbs 92% of all playback traffic before it ' +
        'ever reaches origin — making hit rate the single most important operational lever.',
      components: [
        { name: 'API Gateway',
          role: 'Entry point for both uploads and streaming manifest requests. Writes raw files to S3 and enqueues transcoding jobs.' },
        { name: 'Message Queue',
          role: 'Durable job buffer between upload and transcoding. Decouples ingestion from processing — queue depth spikes during upload bursts without dropping jobs.' },
        { name: 'Media Processor',
          role: 'Distributed FFMPEG worker pool. Reads raw segments from S3, transcodes to HLS + DASH at multiple bitrates in parallel, writes finished segments back to S3.' },
        { name: 'DNS',
          role: '300s TTL routes users to the nearest CDN PoP. Anycast routing keeps resolution latency under 5ms globally.' },
        { name: 'CDN (Multi-tier)',
          role: '92% hit rate across edge + mid-tier. Cache request collapsing ensures a viral video premiere only generates 1 origin fetch per edge, not 1 per viewer.' },
        { name: 'Load Balancer',
          role: 'Routes CDN cache-miss manifest requests to the API tier. Segment fetches bypass it entirely — CDN pulls segments directly from S3.' },
        { name: 'Raw Uploads (S3)',
          role: 'Source uploads before processing. Object lifecycle policies move these to Glacier after transcoding completes, cutting storage costs by ~80%.' },
        { name: 'Video Segments (S3)',
          role: 'Hot origin for all transcoded segments across every bitrate and format. 99.999% durability. The CDN pulls from here on cache miss.' },
        { name: 'Video Metadata (DB)',
          role: 'Stores manifest URLs, available bitrates, processing status, and video attributes. Queried on every manifest request.' },
      ],
      watchFor: [
        'Message Queue depth — rises when upload bursts outpace transcoding worker throughput.',
        'Media Processor utilisation — the encoding ceiling; each worker handles one segment at a time.',
        'CDN hit rate — the most powerful cost lever. At 0.92 only 8% of streams hit origin.',
        'Video Segments read throughput — the hot path under high concurrent streaming load.',
        'CDN → origin fetch volume — should be tiny at steady state; a spike signals a cache miss flood.',
      ],
      tryThis:
        'Simulate a live premiere: raise Client RPS to 5,000 and drop CDN hitRate to 0.4 ' +
        '(new content, nothing cached yet). Watch the Video Segments object store read throughput ' +
        'saturate as every viewer triggers an origin fetch. Then restore hitRate to 0.92 to see ' +
        'the CDN absorb 92% of load and the origin return to idle.',
    },
  },
  {
    slug:        'ride_sharing',
    name:        'Real-Time Ride Sharing',
    description: 'Geospatial mobility architecture with sub-millisecond driver lookup, WebSocket location streams and greedy low-latency matching.',
    category:    'distributed',
    topology:    rideSharing.topology as unknown as TopologySchema,
    details: {
      overview:
        'Ride sharing is a high-concurrency, location-aware matching problem with hard latency constraints. ' +
        'Driver GPS updates arrive every 3 seconds via persistent WebSocket connections, written directly ' +
        'into a Redis Geospatial index that supports sub-millisecond GEORADIUS queries. When a rider requests a ride, ' +
        'the Matching Service runs a greedy algorithm — finding a good-enough nearby driver in under 2 seconds ' +
        'rather than globally optimal in 10+ seconds. Dynamic Pricing uses Google S2 cell decomposition to ' +
        'calculate surge consistently across geographic zones, and all trip events fan out asynchronously ' +
        'so analytics never block the critical matching path.',
      components: [
        { name: 'Rider App',
          role: 'Issues ride requests and receives real-time driver position updates via WebSocket.' },
        { name: 'Driver App',
          role: 'Streams GPS coordinates every 3 seconds via WebSocket. Receives match offers and navigation instructions.' },
        { name: 'WebSocket Gateway',
          role: 'Maintains persistent bidirectional connections to all active drivers and riders. ' +
                'Backed by a distributed pub/sub so any gateway node can route a message to any connected client.' },
        { name: 'API Gateway',
          role: 'Handles REST traffic — account management, trip history, payments. Also accepts driver GPS updates as a fallback.' },
        { name: 'Matching Service',
          role: 'Greedy matcher — queries Redis Geo for nearby drivers and assigns the closest available one within 2 seconds. ' +
                'Uses idempotent request IDs for at-least-once delivery safety.' },
        { name: 'Dynamic Pricing (S2)',
          role: 'Google S2 cell decomposition for surge calculation. Aggregates supply/demand per geographic cell ' +
                'for consistent pricing across a neighbourhood rather than per-radius averages.' },
        { name: 'Trip Events Stream',
          role: 'Async fan-out for all trip lifecycle events. Decouples the matching hot path from analytics, billing and notifications.' },
        { name: 'Analytics Worker',
          role: 'Consumes trip events for demand forecasting, driver incentive calculation and operational dashboards.' },
        { name: 'Redis Geo Cache',
          role: 'Primary index for active driver locations. GEOADD writes on every GPS update, GEORADIUS queries on every match request. ' +
                'Sharded by city ID — driver locations across cities never share a shard.' },
      ],
      watchFor: [
        'WebSocket Gateway utilisation — scales with concurrent active drivers, not RPS. Saturates at peak commute hours.',
        'Matching Service latency — the 2-second SLA is the user-facing quality bar; p99 above 1.5s signals trouble.',
        'Redis Geo utilisation — every GPS update (300 RPS from Driver App) and every match request hits Redis.',
        'Dynamic Pricing capacity — surge calculation happens on every match; queues here add directly to match latency.',
        'Trip Events Stream depth — should drain near-instantly; backpressure means analytics lag is growing.',
      ],
      tryThis:
        'Simulate rush hour: raise both Rider App and Driver App RPS to 2,000. Watch Matching Service ' +
        'utilisation climb and match latency approach the 2-second SLA. Then drop Redis Geo capacity to ' +
        '5,000 to model a degraded Redis cluster — observe how proximity queries back up and matching collapses.',
    },
  },

  // ── Data & Analytics ─────────────────────────────────────────────────────────
  {
    slug:        'data_analytics',
    name:        'Modern Data Analytics Pipeline',
    description: 'Stream ingestion → ETL workers → object store data lake → analytical warehouse.',
    category:    'data',
    topology:    null,
    details:     null,
  },

  // ── AI & Agents ───────────────────────────────────────────────────────────────
  {
    slug:        'ai_agent',
    name:        'AI Agent Orchestration',
    description: 'Autonomous reasoning architecture with LLM routing, vector memory, tool registries and persistent session state.',
    category:    'ai',
    topology:    aiAgent.topology as unknown as TopologySchema,
    details: {
      overview:
        'Engineering an agentic system means orchestrating LLM reasoning loops with external tools ' +
        'while managing both ephemeral and persistent context. Unlike a stateless API, each agent run ' +
        'involves multiple sequential LLM calls, vector searches, graph lookups, and state writes — ' +
        'so latency compounds and the cost model is fundamentally different from request/response services. ' +
        'The architecture separates concerns into an Orchestration Layer (reasoning, routing, safety) and ' +
        'a Knowledge & Context Layer (memory, tools, graph relations).',
      components: [
        { name: 'LLM Gateway',
          role: 'Routes prompts across models — simple tasks to cheaper models, complex reasoning to flagship. ' +
                'Provides unified rate limiting to prevent runaway agent loops from draining the API budget.' },
        { name: 'Agent Orchestrator',
          role: 'Manages the reasoning loop: plan → tool call → observe → re-plan. ' +
                'Stateful (DB-backed) to support multi-day workflows and session continuity across devices.' },
        { name: 'Safety & Observability Mesh',
          role: 'Sidecar that audits every LLM output for policy violations and records token usage, ' +
                'latency per step, and tool call traces. Fail-open — outage degrades visibility, not throughput.' },
        { name: 'Vector Memory (Pinecone)',
          role: 'Long-term semantic memory. Documents → embeddings → HNSW index for sub-100ms k-NN search. ' +
                'Returns top-k context paragraphs relevant to the current task.' },
        { name: 'Knowledge Graph',
          role: 'Entity and relationship store. Agents query for structured facts (e.g. "who owns this repo?") ' +
                'that are too structured for vector search but too relational for a key-value store.' },
        { name: 'Tool Registry',
          role: 'Catalogue of available tools (APIs, code executors, search). ' +
                'Agents query it to discover what capabilities exist before deciding how to act. ' +
                'Lookup latency scales logarithmically with the number of registered tools.' },
        { name: 'Memory Fabric',
          role: 'Persistent working memory — current plan, intermediate tool results, conversation history. ' +
                'Write-heavy (agents write state every step). Session capacity governs max concurrent runs.' },
      ],
      watchFor: [
        'LLM Gateway TPM utilisation — the most likely hard ceiling; raises costs before causing errors.',
        'Agent Orchestrator concurrency — maxConcurrentAgents × maxSteps determines total LLM call fan-out.',
        'Vector DB query capacity — semantic search runs on every agent step, making it a quiet bottleneck.',
        'Memory Fabric write utilisation — climbs sharply with concurrent sessions × steps per run.',
        'Tool Registry lookup latency — grows logarithmically with toolCount; large registries slow every step.',
      ],
      tryThis:
        'Raise Client RPS to 200 and watch the LLM Gateway TPM utilisation spike as each request ' +
        'fans out into multiple reasoning steps. Then drop rateLimitTpm to 50,000 to simulate a ' +
        'provider quota cut — observe how the orchestrator backs up and error rate climbs.',
    },
  },
]

export const TEMPLATES_BY_CATEGORY = TEMPLATES.reduce<Record<TemplateCategory, Template[]>>(
  (acc, t) => { acc[t.category].push(t); return acc },
  { fundamentals: [], distributed: [], data: [], ai: [] },
)
