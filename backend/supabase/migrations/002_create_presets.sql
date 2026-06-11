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
),
(
  'url_shortener',
  'URL Shortener at Scale',
  'High-throughput URL mapping with analytics pipeline and aggressive caching layers.',
  'distributed',
  3,
  '{"version":"1.0","nodes":[{"id":"client-1","label":"Global Users","position":{"x":430,"y":20},"nodeType":"client","config":{"rps":500,"burst":true}},{"id":"dns-1","label":"DNS (Route 53)","position":{"x":90,"y":148},"nodeType":"dns","config":{"ttlSeconds":300,"regions":4,"latencyMs":5,"failureRate":0.0001}},{"id":"cdn-1","label":"CDN (CloudFront)","position":{"x":280,"y":148},"nodeType":"cdn","config":{"capacity":100000,"latencyMs":8,"failureRate":0,"timeoutMs":5000,"hitRate":0.75}},{"id":"lb-1","label":"Load Balancer","position":{"x":470,"y":148},"nodeType":"load_balancer","config":{"capacity":50000,"latencyMs":1,"failureRate":0,"timeoutMs":5000,"strategy":"round_robin","replicas":2}},{"id":"apigw-1","label":"API Gateway","position":{"x":660,"y":148},"nodeType":"api_gateway","config":{"capacity":20000,"latencyMs":3,"failureRate":0.001,"timeoutMs":5000,"rateLimit":0}},{"id":"redirect-1","label":"Redirect Service","position":{"x":90,"y":340},"nodeType":"microservice","config":{"capacity":15000,"latencyMs":5,"failureRate":0.001,"timeoutMs":2000}},{"id":"keygen-1","label":"Key Gen Service","position":{"x":380,"y":340},"nodeType":"microservice","config":{"capacity":800,"latencyMs":20,"failureRate":0.002,"timeoutMs":3000}},{"id":"worker-1","label":"Analytics Worker","position":{"x":630,"y":430},"nodeType":"worker","config":{"throughput":3000,"latencyMs":50,"failureRate":0.001,"timeoutMs":10000}},{"id":"cache-1","label":"Hot URL Cache","position":{"x":90,"y":608},"nodeType":"cache","config":{"capacity":12000,"latencyMs":1,"failureRate":0,"timeoutMs":500,"hitRate":0.92}},{"id":"nosql-1","label":"URL Mappings (NoSQL)","position":{"x":380,"y":608},"nodeType":"nosql_store","config":{"readCapacity":6000,"writeCapacity":1000,"replicationFactor":3,"latencyMs":5,"failureRate":0.001}},{"id":"stream-1","label":"Click Events Stream","position":{"x":630,"y":608},"nodeType":"stream","config":{"throughput":8000,"latencyMs":10,"failureRate":0,"timeoutMs":1000,"consumerGroups":2}},{"id":"objstore-1","label":"Analytics Lake (S3)","position":{"x":630,"y":730},"nodeType":"object_store","config":{"readThroughputMbps":1000,"latencyMs":20,"failureRate":0.0001,"timeoutMs":10000}}],"edges":[{"id":"e1","sourceId":"client-1","targetId":"dns-1"},{"id":"e2","sourceId":"dns-1","targetId":"cdn-1"},{"id":"e3","sourceId":"cdn-1","targetId":"lb-1","label":"cache miss"},{"id":"e4","sourceId":"lb-1","targetId":"apigw-1"},{"id":"e5","sourceId":"apigw-1","targetId":"redirect-1","label":"GET /:code"},{"id":"e6","sourceId":"apigw-1","targetId":"keygen-1","label":"POST /shorten"},{"id":"e7","sourceId":"redirect-1","targetId":"cache-1"},{"id":"e8","sourceId":"cache-1","targetId":"nosql-1","label":"cache miss"},{"id":"e9","sourceId":"keygen-1","targetId":"nosql-1","label":"write mapping"},{"id":"e10","sourceId":"redirect-1","targetId":"stream-1","label":"click event"},{"id":"e11","sourceId":"stream-1","targetId":"worker-1"},{"id":"e12","sourceId":"worker-1","targetId":"objstore-1"}],"structuralNodes":[{"id":"grp-edge","label":"Edge & Traffic Layer","structuralType":"vpc","position":{"x":50,"y":108},"width":780,"height":160},{"id":"grp-app","label":"Application Services","structuralType":"vpc","position":{"x":50,"y":298},"width":780,"height":240},{"id":"grp-persistence","label":"Persistence & Cache","structuralType":"vpc","position":{"x":50,"y":558},"width":780,"height":270}],"viewport":{"x":20,"y":10,"zoom":0.8}}'::jsonb
),
(
  'social_feed',
  'Social Media Feed',
  'Fan-out write pattern across microservices with multi-tier storage and async workers.',
  'distributed',
  4,
  '{"version":"1.0","nodes":[{"id":"client-1","label":"Users","position":{"x":440,"y":20},"nodeType":"client","config":{"rps":800,"burst":true}},{"id":"dns-1","label":"DNS","position":{"x":80,"y":148},"nodeType":"dns","config":{"ttlSeconds":300,"regions":6,"latencyMs":5,"failureRate":0.0001}},{"id":"cdn-1","label":"CDN","position":{"x":240,"y":148},"nodeType":"cdn","config":{"capacity":200000,"latencyMs":5,"failureRate":0,"timeoutMs":5000,"hitRate":0.8}},{"id":"lb-1","label":"Load Balancer","position":{"x":400,"y":148},"nodeType":"load_balancer","config":{"capacity":100000,"latencyMs":1,"failureRate":0,"timeoutMs":5000,"strategy":"round_robin","replicas":4}},{"id":"waf-1","label":"WAF","position":{"x":560,"y":148},"nodeType":"waf","config":{"inspectionCapacity":80000,"blockRate":0.02,"latencyMs":2,"failureRate":0}},{"id":"apigw-1","label":"API Gateway","position":{"x":720,"y":148},"nodeType":"api_gateway","config":{"capacity":50000,"latencyMs":5,"failureRate":0.001,"timeoutMs":5000,"rateLimit":0}},{"id":"feed-svc","label":"Feed Service","position":{"x":70,"y":336},"nodeType":"microservice","config":{"capacity":20000,"latencyMs":30,"failureRate":0.001,"timeoutMs":3000}},{"id":"post-svc","label":"Post Service","position":{"x":225,"y":336},"nodeType":"microservice","config":{"capacity":5000,"latencyMs":50,"failureRate":0.002,"timeoutMs":5000}},{"id":"media-svc","label":"Media Service","position":{"x":380,"y":336},"nodeType":"microservice","config":{"capacity":8000,"latencyMs":100,"failureRate":0.002,"timeoutMs":10000}},{"id":"ml-svc","label":"ML Discovery","position":{"x":535,"y":336},"nodeType":"microservice","config":{"capacity":3000,"latencyMs":200,"failureRate":0.005,"timeoutMs":5000}},{"id":"activity-bus","label":"Activity Bus","position":{"x":762,"y":328},"nodeType":"stream","config":{"throughput":50000,"latencyMs":5,"failureRate":0,"timeoutMs":1000,"consumerGroups":3}},{"id":"fanout-worker","label":"Fan Out Worker","position":{"x":762,"y":448},"nodeType":"worker","config":{"throughput":10000,"latencyMs":100,"failureRate":0.001,"timeoutMs":15000}},{"id":"notif-svc","label":"Notification Service","position":{"x":762,"y":568},"nodeType":"microservice","config":{"capacity":15000,"latencyMs":20,"failureRate":0.001,"timeoutMs":5000}},{"id":"feed-cache","label":"Feed Cache (Redis)","position":{"x":80,"y":736},"nodeType":"cache","config":{"capacity":50000,"latencyMs":2,"failureRate":0,"timeoutMs":500,"hitRate":0.9}},{"id":"media-meta","label":"Media Metadata","position":{"x":290,"y":736},"nodeType":"nosql_store","config":{"readCapacity":15000,"writeCapacity":3000,"replicationFactor":3,"latencyMs":5,"failureRate":0.001}},{"id":"feed-store","label":"Feed Store (NoSQL)","position":{"x":500,"y":736},"nodeType":"nosql_store","config":{"readCapacity":20000,"writeCapacity":10000,"replicationFactor":3,"latencyMs":8,"failureRate":0.001}},{"id":"media-assets","label":"Media Assets","position":{"x":710,"y":736},"nodeType":"object_store","config":{"readThroughputMbps":10000,"latencyMs":30,"failureRate":0.0001,"timeoutMs":10000}}],"edges":[{"id":"e1","sourceId":"client-1","targetId":"dns-1"},{"id":"e2","sourceId":"dns-1","targetId":"cdn-1"},{"id":"e3","sourceId":"cdn-1","targetId":"lb-1","label":"cache miss"},{"id":"e4","sourceId":"lb-1","targetId":"waf-1"},{"id":"e5","sourceId":"waf-1","targetId":"apigw-1"},{"id":"e6","sourceId":"apigw-1","targetId":"feed-svc"},{"id":"e7","sourceId":"apigw-1","targetId":"post-svc"},{"id":"e8","sourceId":"apigw-1","targetId":"media-svc"},{"id":"e9","sourceId":"apigw-1","targetId":"ml-svc"},{"id":"e10","sourceId":"post-svc","targetId":"activity-bus"},{"id":"e11","sourceId":"activity-bus","targetId":"fanout-worker"},{"id":"e12","sourceId":"activity-bus","targetId":"notif-svc"},{"id":"e13","sourceId":"fanout-worker","targetId":"feed-store"},{"id":"e14","sourceId":"feed-svc","targetId":"feed-cache"},{"id":"e15","sourceId":"feed-cache","targetId":"feed-store","label":"cache miss"},{"id":"e16","sourceId":"media-svc","targetId":"media-meta"},{"id":"e17","sourceId":"media-svc","targetId":"media-assets"},{"id":"e18","sourceId":"ml-svc","targetId":"feed-cache","label":"personalise"}],"structuralNodes":[{"id":"grp-edge","label":"Edge Network","structuralType":"vpc","position":{"x":40,"y":90},"width":920,"height":160},{"id":"grp-microservice","label":"Microservice Layer","structuralType":"vpc","position":{"x":40,"y":278},"width":660,"height":160},{"id":"grp-eventbus","label":"Event Bus & Workers","structuralType":"vpc","position":{"x":720,"y":278},"width":260,"height":390},{"id":"grp-datastore","label":"Global Data Store","structuralType":"vpc","position":{"x":40,"y":688},"width":920,"height":160}],"viewport":{"x":10,"y":10,"zoom":0.75}}'::jsonb
),
(
  'video_streaming',
  'Video Streaming Platform',
  'Media delivery with distributed transcoding workers, multi-tier CDN offload and adaptive bitrate streaming.',
  'distributed',
  5,
  '{"version":"2.0","nodes":[{"id":"client-1","label":"Users","position":{"x":460,"y":20},"nodeType":"client","config":{"rps":1000,"burst":true}},{"id":"apigw-1","label":"API Gateway","position":{"x":140,"y":185},"nodeType":"api_gateway","config":{"capacity":30000,"latencyMs":5,"failureRate":0.001,"timeoutMs":5000,"rateLimit":0,"authOverheadMs":5}},{"id":"queue-1","label":"Message Queue","position":{"x":140,"y":335},"nodeType":"queue","config":{"delayMs":500,"maxDepth":50000}},{"id":"worker-1","label":"Media Processor","position":{"x":140,"y":480},"nodeType":"worker","config":{"throughput":300,"processingMs":8000,"failureRate":0.01,"retries":3,"concurrency":80}},{"id":"dns-1","label":"DNS","position":{"x":460,"y":185},"nodeType":"dns","config":{"ttlSeconds":300,"regions":6,"latencyMs":5,"failureRate":0.0001}},{"id":"cdn-1","label":"CDN (Multi-tier)","position":{"x":650,"y":185},"nodeType":"cdn","config":{"capacity":500000,"latencyMs":8,"failureRate":0,"timeoutMs":5000,"hitRate":0.92}},{"id":"lb-1","label":"Load Balancer","position":{"x":845,"y":185},"nodeType":"load_balancer","config":{"capacity":50000,"latencyMs":1,"failureRate":0,"timeoutMs":5000,"strategy":"round_robin","replicas":4}},{"id":"obj-raw","label":"Raw Uploads (S3)","position":{"x":460,"y":435},"nodeType":"object_store","config":{"readThroughputMbps":20000,"writeThroughputMbps":10000,"latencyMs":30,"failureRate":0.0001,"maxObjectSizeMb":0}},{"id":"obj-seg","label":"Video Segments (S3)","position":{"x":655,"y":435},"nodeType":"object_store","config":{"readThroughputMbps":100000,"writeThroughputMbps":30000,"latencyMs":15,"failureRate":0.0001,"maxObjectSizeMb":0}},{"id":"db-meta","label":"Video Metadata","position":{"x":845,"y":435},"nodeType":"database","config":{"capacity":8000,"latencyMs":10,"failureRate":0.001,"timeoutMs":5000}}],"edges":[{"id":"e1","sourceId":"client-1","targetId":"apigw-1","label":"upload"},{"id":"e2","sourceId":"client-1","targetId":"dns-1"},{"id":"e3","sourceId":"dns-1","targetId":"cdn-1"},{"id":"e4","sourceId":"cdn-1","targetId":"lb-1","label":"cache miss"},{"id":"e5","sourceId":"cdn-1","targetId":"obj-seg","label":"origin fetch"},{"id":"e6","sourceId":"lb-1","targetId":"apigw-1","label":"manifest request"},{"id":"e7","sourceId":"apigw-1","targetId":"obj-raw","label":"upload"},{"id":"e8","sourceId":"apigw-1","targetId":"queue-1","label":"enqueue job"},{"id":"e9","sourceId":"apigw-1","targetId":"db-meta","label":"write metadata"},{"id":"e10","sourceId":"queue-1","targetId":"worker-1","label":"transcode job"},{"id":"e11","sourceId":"worker-1","targetId":"obj-raw","label":"read source"},{"id":"e12","sourceId":"worker-1","targetId":"obj-seg","label":"write"}],"structuralNodes":[{"id":"grp-ingest","label":"Ingestion & Processing","structuralType":"vpc","position":{"x":60,"y":125},"width":240,"height":440},{"id":"grp-cdn","label":"Delivery & CDN Layer","structuralType":"vpc","position":{"x":390,"y":125},"width":580,"height":165},{"id":"grp-storage","label":"Media & Metadata Storage","structuralType":"vpc","position":{"x":390,"y":375},"width":580,"height":175}],"viewport":{"x":10,"y":10,"zoom":0.78}}'::jsonb
),
(
  'ride_sharing',
  'Real-Time Ride Sharing',
  'Geospatial mobility architecture with sub-millisecond driver lookup, WebSocket location streams and greedy low-latency matching.',
  'distributed',
  6,
  '{"version":"2.0","nodes":[{"id":"rider-app","label":"Rider App","position":{"x":190,"y":20},"nodeType":"client","config":{"rps":400,"burst":true}},{"id":"driver-app","label":"Driver App","position":{"x":400,"y":20},"nodeType":"client","config":{"rps":300,"burst":false}},{"id":"ws-gw","label":"WebSocket Gateway","position":{"x":40,"y":235},"nodeType":"microservice","config":{"capacity":50000,"latencyMs":5,"failureRate":0.001,"timeoutMs":30000}},{"id":"api-gw","label":"API Gateway","position":{"x":260,"y":235},"nodeType":"api_gateway","config":{"capacity":20000,"latencyMs":5,"failureRate":0.001,"timeoutMs":5000,"rateLimit":0,"authOverheadMs":5}},{"id":"matching-svc","label":"Matching Service","position":{"x":490,"y":215},"nodeType":"microservice","config":{"capacity":5000,"latencyMs":150,"failureRate":0.002,"timeoutMs":2000}},{"id":"pricing-svc","label":"Dynamic Pricing (S2)","position":{"x":660,"y":215},"nodeType":"microservice","config":{"capacity":3000,"latencyMs":80,"failureRate":0.002,"timeoutMs":1000}},{"id":"trip-stream","label":"Trip Events Stream","position":{"x":210,"y":445},"nodeType":"stream","config":{"partitions":8,"throughput":20000,"retentionMs":86400000,"consumerGroups":2,"failureRate":0}},{"id":"analytics-worker","label":"Analytics Worker","position":{"x":350,"y":445},"nodeType":"worker","config":{"throughput":500,"processingMs":1000,"failureRate":0.01,"retries":3,"concurrency":10}},{"id":"redis-geo","label":"Redis Geo Cache","position":{"x":540,"y":445},"nodeType":"cache","config":{"capacity":30000,"latencyMs":1,"failureRate":0.001,"timeoutMs":500,"hitRate":0.95}}],"edges":[{"id":"e1","sourceId":"rider-app","targetId":"ws-gw","label":"WebSocket"},{"id":"e2","sourceId":"driver-app","targetId":"ws-gw","label":"WebSocket"},{"id":"e3","sourceId":"rider-app","targetId":"api-gw"},{"id":"e4","sourceId":"driver-app","targetId":"api-gw","label":"GPS update"},{"id":"e5","sourceId":"ws-gw","targetId":"matching-svc","label":"ride request"},{"id":"e6","sourceId":"ws-gw","targetId":"redis-geo","label":"location push"},{"id":"e7","sourceId":"api-gw","targetId":"matching-svc"},{"id":"e8","sourceId":"api-gw","targetId":"trip-stream","label":"ride data"},{"id":"e9","sourceId":"matching-svc","targetId":"redis-geo","label":"query proximity"},{"id":"e10","sourceId":"matching-svc","targetId":"pricing-svc","label":"surge check"},{"id":"e11","sourceId":"matching-svc","targetId":"ws-gw","label":"match offer"},{"id":"e12","sourceId":"pricing-svc","targetId":"redis-geo","label":"demand query"},{"id":"e13","sourceId":"trip-stream","targetId":"analytics-worker"}],"structuralNodes":[{"id":"grp-edge","label":"Edge & API Gateway","structuralType":"vpc","position":{"x":160,"y":165},"width":230,"height":155},{"id":"grp-matching","label":"Real-time Matching Hub","structuralType":"vpc","position":{"x":420,"y":155},"width":330,"height":165},{"id":"grp-async","label":"Async Ops & Analytics","structuralType":"vpc","position":{"x":160,"y":390},"width":270,"height":150},{"id":"grp-geo","label":"Geospatial State & Cache","structuralType":"vpc","position":{"x":450,"y":390},"width":260,"height":150}],"viewport":{"x":15,"y":10,"zoom":0.88}}'::jsonb
),
(
  'ai_agent',
  'AI Agent Orchestration',
  'Autonomous reasoning architecture with LLM routing, vector memory, tool registries and persistent session state.',
  'ai',
  7,
  '{"version":"2.0","nodes":[{"id":"client-1","label":"Users","position":{"x":440,"y":20},"nodeType":"client","config":{"rps":50,"burst":false}},{"id":"llm-gw","label":"LLM Gateway","position":{"x":120,"y":190},"nodeType":"llm_gateway","config":{"tokensPerSecond":80,"avgPromptTokens":800,"avgCompletionTokens":400,"rateLimitTpm":150000,"failureRate":0.02,"timeoutMs":60000}},{"id":"agent-orch","label":"Agent Orchestrator","position":{"x":380,"y":190},"nodeType":"agent_orchestrator","config":{"maxConcurrentAgents":20,"stepLatencyMs":80,"maxSteps":15,"failureRate":0.03,"timeoutMs":120000}},{"id":"obs-mesh","label":"Safety & Observability Mesh","position":{"x":640,"y":190},"nodeType":"observability_mesh","config":{"inspectionRps":10000,"samplingRate":0.15,"latencyMs":3,"failureRate":0}},{"id":"vector-db","label":"Vector Memory (Pinecone)","position":{"x":80,"y":430},"nodeType":"vector_db","config":{"queryCapacity":500,"indexSizeM":10,"dimensions":1536,"queryLatencyMs":40,"failureRate":0.005}},{"id":"graph-db","label":"Knowledge Graph","position":{"x":290,"y":430},"nodeType":"graph_db","config":{"queryCapacity":1000,"writeCapacity":300,"latencyMs":25,"failureRate":0.002}},{"id":"tool-reg","label":"Tool Registry","position":{"x":510,"y":430},"nodeType":"tool_registry","config":{"capacity":3000,"toolCount":40,"latencyMs":12,"failureRate":0.001}},{"id":"mem-fabric","label":"Memory Fabric","position":{"x":720,"y":430},"nodeType":"memory_fabric","config":{"readCapacity":8000,"writeCapacity":4000,"sessionCapacity":200,"latencyMs":8,"failureRate":0.001}}],"edges":[{"id":"e1","sourceId":"client-1","targetId":"llm-gw","label":"prompt"},{"id":"e2","sourceId":"client-1","targetId":"agent-orch"},{"id":"e3","sourceId":"agent-orch","targetId":"llm-gw","label":"reasoning loop"},{"id":"e4","sourceId":"agent-orch","targetId":"obs-mesh","label":"audit"},{"id":"e5","sourceId":"agent-orch","targetId":"tool-reg","label":"tool lookup"},{"id":"e6","sourceId":"agent-orch","targetId":"mem-fabric","label":"read/write state"},{"id":"e7","sourceId":"agent-orch","targetId":"vector-db","label":"semantic search"},{"id":"e8","sourceId":"agent-orch","targetId":"graph-db","label":"entity lookup"},{"id":"e9","sourceId":"llm-gw","targetId":"obs-mesh","label":"token usage"},{"id":"e10","sourceId":"vector-db","targetId":"agent-orch","label":"top-k context"},{"id":"e11","sourceId":"graph-db","targetId":"agent-orch","label":"relations"}],"structuralNodes":[{"id":"grp-orchestration","label":"AI Orchestration Layer","structuralType":"vpc","position":{"x":50,"y":140},"width":740,"height":160},{"id":"grp-knowledge","label":"Knowledge & Context Layer","structuralType":"vpc","position":{"x":50,"y":380},"width":740,"height":160}],"viewport":{"x":20,"y":10,"zoom":0.85}}'::jsonb
);
