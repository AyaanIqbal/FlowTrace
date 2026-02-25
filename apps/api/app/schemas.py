from __future__ import annotations

from typing import Any
from typing import Optional, Union

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    label: Optional[str] = None


class SessionResponse(BaseModel):
    session_id: str


class SessionListItem(BaseModel):
    id: str
    started_ts: int
    ended_ts: Optional[int]
    label: Optional[str]
    event_count: int


class SessionEndResponse(BaseModel):
    ok: bool


class EventIn(BaseModel):
    id: Optional[str] = None
    session_id: str
    ts: int
    type: str
    url: Optional[str] = None
    tab_id: Optional[Union[str, int]] = None
    title: Optional[str] = None
    selector: Optional[str] = None
    text: Optional[str] = None
    meta: dict[str, Any] = Field(default_factory=dict)


class EventOut(BaseModel):
    id: str
    session_id: str
    ts: int
    type: str
    url: Optional[str]
    tab_id: Optional[str]
    title: Optional[str]
    selector: Optional[str]
    text: Optional[str]
    meta: dict[str, Any]


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    url: Optional[str] = None
    ts: int


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class MemoryItemOut(BaseModel):
    id: str
    user_id: str
    domain: str
    kind: str
    key: str
    value: str
    count: int
    updated_ts: int


class PredictionOut(BaseModel):
    suggestion: str
    confidence: float
