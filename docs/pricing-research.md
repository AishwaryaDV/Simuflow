# Pricing Research — Open Questions

Before building the per-node instance/SKU pricing feature, the following decisions need to be made.
Work through each section and fill in the answers — the implementation scope depends entirely on these choices.

---

## 1. Which clouds to support?

**Question:** AWS only, or AWS + GCP + Azure?

- AWS only = simplest. One pricing model, one API, one set of SKUs.
- Multi-cloud = 3× the data, 3× the SKU mapping, UI needs a cloud selector per node.
- GCP and Azure have different instance naming conventions and pricing structures.

**Decision needed:** [ ] AWS only &nbsp;&nbsp; [ ] AWS + GCP &nbsp;&nbsp; [ ] All three

---

## 2. Instance type → node type default mapping

Each SimuFlow node type needs a **default SKU** to show a price when no custom SKU is selected.
Research what a realistic default looks like for each type.

| Node Type | Suggested default SKU | Pricing model | Notes |
|---|---|---|---|
| Client | — | n/a | Traffic generator, no cloud cost |
| API Gateway | ? | per-hour | e.g. AWS API Gateway + EC2 combo? |
| Load Balancer | ? | per-hour | e.g. ALB — charged per LCU |
| API Server | ? | per-hour | e.g. t3.medium EC2 |
| Microservice | ? | per-hour | e.g. t3.small or ECS Fargate task |
| Cache | ? | per-hour | e.g. ElastiCache cache.t3.micro |
| Database | ? | per-hour | e.g. RDS db.t3.medium |
| Queue | ? | per-request | e.g. SQS — per million messages |
| Stream | ? | per-hour | e.g. Kinesis — per shard-hour |
| PubSub | ? | per-message | e.g. SNS — per million |
| CDN | ? | per-GB | e.g. CloudFront — per GB transferred |
| Worker | ? | per-hour | e.g. t3.small EC2 |
| Serverless | ? | per-request | e.g. Lambda — per million invocations |
| Object Store | ? | per-GB/month | e.g. S3 standard |
| External Service | — | n/a | Third-party, no cloud cost to show |
| LLM Gateway | ? | per-token | e.g. Bedrock Claude pricing |
| Vector DB | ? | per-hour | e.g. Pinecone pod or OpenSearch |
| Agent Orchestrator | ? | per-hour | e.g. ECS Fargate |
| DNS | ? | per-query | e.g. Route 53 — per million queries |
| NoSQL Store | ? | per-hour | e.g. DynamoDB on-demand or DAX |
| WAF | ? | per-hour | e.g. AWS WAF — per rule + per request |
| Observability Mesh | ? | per-hour | e.g. CloudWatch + X-Ray |
| Tool Registry | ? | per-hour | Custom — no direct AWS equivalent |
| Memory Fabric | ? | per-hour | e.g. ElastiCache Redis |
| Graph DB | ? | per-hour | e.g. Neptune |

---

## 3. Pricing model per node type

Not all nodes are billed the same way. Decide how SimuFlow should represent each:

| Model | Description | Nodes that use it |
|---|---|---|
| Per-hour | Fixed instance rate — multiply by hours running | Most compute + DB |
| Per-request | Rate per million requests/invocations | Serverless, Queue, PubSub, DNS |
| Per-GB | Rate per GB transferred or stored | CDN, Object Store |
| Per-token | Rate per 1k tokens (input/output) | LLM Gateway |
| Hybrid | Multiple components (e.g. RDS = instance + storage + I/O) | Database, NoSQL |

**Decision needed:** Do you show a single blended rate per node, or break out components?

---

## 4. Regional variance

AWS prices differ by region (us-east-1 is usually cheapest).

**Decision needed:**
- [ ] Show us-east-1 prices only (simplest)
- [ ] Let user pick region globally (one selector in settings)
- [ ] Let user pick region per node (complex, probably overkill)

---

## 5. Source of truth for pricing data

How do we get the numbers?

| Option | Pros | Cons |
|---|---|---|
| Hardcode a snapshot | Zero infra, instant | Goes stale — need manual updates |
| AWS Pricing API (public JSON) | Always current | Large files, parsing complexity |
| AWS Price List Bulk API | Most complete | Very large, needs filtering pipeline |
| Infracost API | Pre-parsed, SDK available | Third-party dependency |

**Decision needed:** [ ] Hardcoded snapshot &nbsp;&nbsp; [ ] AWS Pricing API &nbsp;&nbsp; [ ] Infracost

---

## 6. Custom SKU UX

Users should be able to override the default SKU per node.

**Questions:**
- Is it a free-text field (type `db.r6g.large`) or a searchable dropdown?
- Do we validate the SKU against real AWS SKUs?
- Does changing the SKU update the $/hr immediately or on blur?

---

## 7. LLM Gateway special case

LLM nodes are billed per token, not per hour. The simulation tracks RPS — you'd need to:
- Assume an average tokens-per-request value (configurable per node)
- Multiply by the model's per-token rate
- Show $/1k tokens + estimated $/hr based on current RPS

**Decision needed:** Is estimated $/hr from token rate acceptable, or show $/1k tokens directly?

---

## Summary checklist

- [ ] Cloud scope decided (Q1)
- [ ] Default SKU per node type filled in (Q2 table)
- [ ] Pricing model per type decided — blended or broken out (Q3)
- [ ] Region strategy decided (Q4)
- [ ] Data source decided (Q5)
- [ ] Custom SKU UX decided (Q6)
- [ ] LLM billing approach decided (Q7)
