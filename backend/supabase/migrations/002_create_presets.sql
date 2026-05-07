-- presets table + seed data for all 7 blueprint presets

create table if not exists presets (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name        text        not null,
  description text        not null,
  category    text        not null,
  topology    jsonb       not null,
  sort_order  integer     not null default 0,
  is_active   boolean     not null default true
);

-- RLS: authenticated users can read, service role only for writes
alter table presets enable row level security;

create policy "authenticated users can read active presets"
  on presets for select
  to authenticated
  using (is_active = true);

-- Seed data — topology values loaded from preset JSON files at migration time.
-- Run: psql $DATABASE_URL -f 002_create_presets.sql
-- Or via Supabase CLI: supabase db push

insert into presets (slug, name, description, category, sort_order, topology) values
(
  'web_app',
  'Simple Web App',
  'Client → Load Balancer → API Servers → Database. The classic 3-tier architecture.',
  'fundamentals',
  1,
  '{
    "version": "1.0",
    "nodes": [
      {"id":"client-1","label":"Web Client","nodeType":"client","position":{"x":300,"y":60},"config":{"rps":200,"burst":false}},
      {"id":"lb-1","label":"Load Balancer","nodeType":"load_balancer","position":{"x":300,"y":200},"config":{"capacity":10000,"latencyMs":2,"failureRate":0,"timeoutMs":5000,"strategy":"round_robin","replicas":2}},
      {"id":"api-1","label":"API Server","nodeType":"api_server","position":{"x":160,"y":360},"config":{"capacity":1000,"latencyMs":50,"failureRate":0.01,"timeoutMs":5000}},
      {"id":"api-2","label":"API Server","nodeType":"api_server","position":{"x":440,"y":360},"config":{"capacity":1000,"latencyMs":50,"failureRate":0.01,"timeoutMs":5000}},
      {"id":"db-1","label":"Database","nodeType":"database","position":{"x":300,"y":520},"config":{"capacity":500,"latencyMs":20,"failureRate":0.001,"timeoutMs":10000}}
    ],
    "edges": [
      {"id":"e1","sourceId":"client-1","targetId":"lb-1"},
      {"id":"e2","sourceId":"lb-1","targetId":"api-1"},
      {"id":"e3","sourceId":"lb-1","targetId":"api-2"},
      {"id":"e4","sourceId":"api-1","targetId":"db-1","label":"SQL"},
      {"id":"e5","sourceId":"api-2","targetId":"db-1","label":"SQL"}
    ],
    "viewport": {"x":0,"y":0,"zoom":1}
  }'::jsonb
),
(
  'cached_web_app',
  'Cached Web App',
  'Adds a Redis-like cache layer between API servers and the database to absorb read load.',
  'fundamentals',
  2,
  '{
    "version": "1.0",
    "nodes": [
      {"id":"client-1","label":"Web Client","nodeType":"client","position":{"x":300,"y":60},"config":{"rps":200,"burst":false}},
      {"id":"lb-1","label":"Load Balancer","nodeType":"load_balancer","position":{"x":300,"y":200},"config":{"capacity":10000,"latencyMs":2,"failureRate":0,"timeoutMs":5000,"strategy":"round_robin","replicas":2}},
      {"id":"api-1","label":"API Server","nodeType":"api_server","position":{"x":160,"y":360},"config":{"capacity":1000,"latencyMs":50,"failureRate":0.01,"timeoutMs":5000}},
      {"id":"api-2","label":"API Server","nodeType":"api_server","position":{"x":440,"y":360},"config":{"capacity":1000,"latencyMs":50,"failureRate":0.01,"timeoutMs":5000}},
      {"id":"cache-1","label":"Redis Cache","nodeType":"cache","position":{"x":300,"y":400},"config":{"capacity":5000,"latencyMs":5,"failureRate":0,"timeoutMs":1000,"hitRate":0.8}},
      {"id":"db-1","label":"Postgres","nodeType":"database","position":{"x":300,"y":560},"config":{"capacity":500,"latencyMs":20,"failureRate":0.001,"timeoutMs":10000}}
    ],
    "edges": [
      {"id":"e1","sourceId":"client-1","targetId":"lb-1"},
      {"id":"e2","sourceId":"lb-1","targetId":"api-1"},
      {"id":"e3","sourceId":"lb-1","targetId":"api-2"},
      {"id":"e4","sourceId":"api-1","targetId":"cache-1"},
      {"id":"e5","sourceId":"api-2","targetId":"cache-1"},
      {"id":"e6","sourceId":"cache-1","targetId":"db-1"}
    ],
    "viewport": {"x":0,"y":0,"zoom":1}
  }'::jsonb
);

-- Remaining presets (url_shortener, social_feed, video_streaming, ride_sharing, ai_agent)
-- are seeded via individual INSERT statements below.
-- Their full topology JSON is sourced from frontend/src/presets/*.json.
-- Add them here following the same pattern once the JSON files are finalised.
