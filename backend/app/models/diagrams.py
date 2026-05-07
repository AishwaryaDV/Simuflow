from datetime import datetime
from pydantic import ConfigDict
from pydantic.alias_generators import to_camel
from app.models.topology import SimuFlowBase, TopologySchema


class DiagramSummary(SimuFlowBase):
    id:          str
    name:        str
    is_public:   bool
    fork_count:  int
    created_at:  datetime
    updated_at:  datetime


class DiagramResponse(DiagramSummary):
    topology:    TopologySchema
    share_token: str | None = None


class DiagramListResponse(SimuFlowBase):
    items:     list[DiagramSummary]
    total:     int
    page:      int
    page_size: int


class CreateDiagramRequest(SimuFlowBase):
    name:     str          = "Untitled Diagram"
    topology: TopologySchema


class UpdateDiagramRequest(SimuFlowBase):
    name:     str | None           = None
    topology: TopologySchema | None = None


class ShareResponse(SimuFlowBase):
    share_url:   str
    share_token: str
    is_public:   bool = True


class ForkResponse(SimuFlowBase):
    diagram_id: str
    name:       str


class PresetBlueprint(SimuFlowBase):
    slug:        str
    name:        str
    description: str
    category:    str
    sort_order:  int
    topology:    TopologySchema
