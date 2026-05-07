"""
Pydantic models mirroring frontend/src/types/topology.ts.
camelCase ↔ snake_case handled by alias_generator=to_camel.
"""
from __future__ import annotations
from enum import Enum
from typing import Annotated, Any, Union
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class SimuFlowBase(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


# ── Enums ─────────────────────────────────────────────────────────────────────

class NodeType(str, Enum):
    client              = "client"
    load_balancer       = "load_balancer"
    api_server          = "api_server"
    cache               = "cache"
    database            = "database"
    queue               = "queue"
    cdn                 = "cdn"
    microservice        = "microservice"
    api_gateway         = "api_gateway"
    serverless          = "serverless"
    worker              = "worker"
    pub_sub             = "pub_sub"
    stream              = "stream"
    rate_limiter        = "rate_limiter"
    object_store        = "object_store"
    external_service    = "external_service"
    llm_gateway         = "llm_gateway"
    vector_db           = "vector_db"
    agent_orchestrator  = "agent_orchestrator"
    dns                 = "dns"
    no_sql_store        = "no_sql_store"
    waf                 = "waf"
    observability_mesh  = "observability_mesh"
    tool_registry       = "tool_registry"
    memory_fabric       = "memory_fabric"
    graph_db            = "graph_db"


class LBStrategy(str, Enum):
    round_robin       = "round_robin"
    least_connections = "least_connections"
    random            = "random"


# ── Position / Viewport ───────────────────────────────────────────────────────

class CanvasPosition(SimuFlowBase):
    x: float
    y: float


class CanvasViewport(SimuFlowBase):
    x: float
    y: float
    zoom: float


# ── Node configs (accept any extra fields for forward-compat) ─────────────────

class NodeConfig(SimuFlowBase):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        extra="allow",
    )


# ── Node / Edge ───────────────────────────────────────────────────────────────

class NodeDef(SimuFlowBase):
    id:         str
    label:      str
    node_type:  NodeType
    position:   CanvasPosition
    config:     NodeConfig


class EdgeDef(SimuFlowBase):
    id:            str
    source_id:     str
    target_id:     str
    label:         str | None  = None
    bidirectional: bool        = False


# ── TopologySchema ─────────────────────────────────────────────────────────────

class TopologySchema(SimuFlowBase):
    version:  str          = "1.0"
    nodes:    list[NodeDef]
    edges:    list[EdgeDef]
    viewport: CanvasViewport
