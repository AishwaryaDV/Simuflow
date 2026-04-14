/**
 * templates/index.ts
 * Registry of all SimuFlow templates, organised by category.
 * Templates with topology = null are "coming soon" placeholders.
 */

import type { TopologySchema } from '../types/topology'

import webApp       from '../presets/web_app.json'
import cachedWebApp from '../presets/cached_web_app.json'

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
    topology:    null,
    details:     null,
  },
  {
    slug:        'social_feed',
    name:        'Social Media Feed',
    description: 'Fan-out write pattern across microservices with multi-tier storage and async workers.',
    category:    'distributed',
    topology:    null,
    details:     null,
  },
  {
    slug:        'video_streaming',
    name:        'Video Streaming Platform',
    description: 'Media delivery with transcoding workers, CDN offload and multi-region object storage.',
    category:    'distributed',
    topology:    null,
    details:     null,
  },
  {
    slug:        'ride_sharing',
    name:        'Real-Time Ride Sharing',
    description: 'Geospatial matching system with live location streams and dynamic pricing services.',
    category:    'distributed',
    topology:    null,
    details:     null,
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
    description: 'Agentic workflows with LLM gateways, vector memory, tool registries and orchestrators.',
    category:    'ai',
    topology:    null,
    details:     null,
  },
]

export const TEMPLATES_BY_CATEGORY = TEMPLATES.reduce<Record<TemplateCategory, Template[]>>(
  (acc, t) => { acc[t.category].push(t); return acc },
  { fundamentals: [], distributed: [], data: [], ai: [] },
)
