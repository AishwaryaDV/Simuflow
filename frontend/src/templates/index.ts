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

export interface Template {
  slug:        string
  name:        string
  description: string
  category:    TemplateCategory
  topology:    TopologySchema | null   // null = coming soon
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
    topology:    null,  // special-cased: clears canvas instead of loading topology
  },
  {
    slug:        'web_app',
    name:        'Simple Web App',
    description: 'Client → Load Balancer → API Servers → Database. The classic 3-tier architecture.',
    category:    'fundamentals',
    topology:    webApp.topology as unknown as TopologySchema,
  },
  {
    slug:        'cached_web_app',
    name:        'Cached Web App',
    description: 'Adds a Redis-like cache layer between API servers and the database to absorb read load.',
    category:    'fundamentals',
    topology:    cachedWebApp.topology as unknown as TopologySchema,
  },

  // ── Distributed Systems ───────────────────────────────────────────────────────
  {
    slug:        'url_shortener',
    name:        'URL Shortener at Scale',
    description: 'High-throughput URL mapping with analytics pipeline and aggressive caching layers.',
    category:    'distributed',
    topology:    null,
  },
  {
    slug:        'social_feed',
    name:        'Social Media Feed',
    description: 'Fan-out write pattern across microservices with multi-tier storage and async workers.',
    category:    'distributed',
    topology:    null,
  },
  {
    slug:        'video_streaming',
    name:        'Video Streaming Platform',
    description: 'Media delivery with transcoding workers, CDN offload and multi-region object storage.',
    category:    'distributed',
    topology:    null,
  },
  {
    slug:        'ride_sharing',
    name:        'Real-Time Ride Sharing',
    description: 'Geospatial matching system with live location streams and dynamic pricing services.',
    category:    'distributed',
    topology:    null,
  },

  // ── Data & Analytics ─────────────────────────────────────────────────────────
  {
    slug:        'data_analytics',
    name:        'Modern Data Analytics Pipeline',
    description: 'Stream ingestion → ETL workers → object store data lake → analytical warehouse.',
    category:    'data',
    topology:    null,
  },

  // ── AI & Agents ───────────────────────────────────────────────────────────────
  {
    slug:        'ai_agent',
    name:        'AI Agent Orchestration',
    description: 'Agentic workflows with LLM gateways, vector memory, tool registries and orchestrators.',
    category:    'ai',
    topology:    null,
  },
]

export const TEMPLATES_BY_CATEGORY = TEMPLATES.reduce<Record<TemplateCategory, Template[]>>(
  (acc, t) => { acc[t.category].push(t); return acc },
  { fundamentals: [], distributed: [], data: [], ai: [] },
)
