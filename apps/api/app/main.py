from __future__ import annotations

import time
import uuid
from typing import Optional
from urllib.parse import urlparse

from fastapi import Body, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, desc, func
from sqlalchemy.orm import Session

from .db import Base, engine, get_db
from .models import EventModel, MemoryItemModel, SessionModel
from .schemas import (
    EventIn,
    EventOut,
    GraphEdge,
    GraphNode,
    GraphResponse,
    MemoryItemOut,
    PredictionOut,
    SessionCreate,
    SessionEndResponse,
    SessionListItem,
    SessionResponse,
)

DEMO_USER_ID = "demo_user"

app = FastAPI(title="ThirdLayer Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


def now_ms() -> int:
    return int(time.time() * 1000)


def parse_domain(url: Optional[str]) -> str:
    if not url:
        return "unknown"
    try:
        return urlparse(url).netloc or "unknown"
    except Exception:
        return "unknown"


def parse_path(url: Optional[str]) -> str:
    if not url:
        return "/"
    try:
        parsed = urlparse(url)
        return parsed.path or "/"
    except Exception:
        return "/"


def upsert_memory(
    db: Session,
    *,
    domain: str,
    kind: str,
    key: str,
    value: str,
    ts: int,
    user_id: str = DEMO_USER_ID,
) -> None:
    item = (
        db.query(MemoryItemModel)
        .filter(
            and_(
                MemoryItemModel.user_id == user_id,
                MemoryItemModel.domain == domain,
                MemoryItemModel.kind == kind,
                MemoryItemModel.key == key,
            )
        )
        .one_or_none()
    )

    if item:
        item.count += 1
        item.value = value
        item.updated_ts = ts
        return

    db.add(
        MemoryItemModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            domain=domain,
            kind=kind,
            key=key,
            value=value,
            count=1,
            updated_ts=ts,
        )
    )


def update_memory_from_event(db: Session, event: EventModel) -> None:
    domain = parse_domain(event.url)
    ts = event.ts

    if event.type == "click":
        selector = event.selector or "unknown"
        key = f"click:{selector}"
        value = f"Clicked {selector} on {domain}"
        upsert_memory(db, domain=domain, kind="frequent_action", key=key, value=value, ts=ts)

    if event.type == "input":
        selector = event.selector or "unknown"
        snippet = (event.text or "").strip()[:40]
        key = f"input:{selector}"
        value = f"Input at {selector}: {snippet}"
        upsert_memory(db, domain=domain, kind="form_field", key=key, value=value, ts=ts)

    if event.type == "url_changed":
        last_event_with_url = (
            db.query(EventModel)
            .filter(
                and_(
                    EventModel.session_id == event.session_id,
                    EventModel.url.is_not(None),
                    EventModel.id != event.id,
                    EventModel.ts <= event.ts,
                )
            )
            .order_by(desc(EventModel.ts))
            .first()
        )
        prev_path = parse_path(last_event_with_url.url if last_event_with_url else None)
        curr_path = parse_path(event.url)
        key = f"path:{prev_path}->{curr_path}"
        value = f"Navigation {prev_path} -> {curr_path} on {domain}"
        upsert_memory(db, domain=domain, kind="nav_path", key=key, value=value, ts=ts)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/sessions", response_model=SessionResponse)
def create_session(
    payload: SessionCreate = Body(default=SessionCreate()),
    db: Session = Depends(get_db),
) -> SessionResponse:
    session_id = str(uuid.uuid4())
    db.add(
        SessionModel(
            id=session_id,
            started_ts=now_ms(),
            ended_ts=None,
            label=payload.label,
        )
    )
    db.commit()
    return SessionResponse(session_id=session_id)


@app.post("/sessions/{session_id}/end", response_model=SessionEndResponse)
def end_session(session_id: str, db: Session = Depends(get_db)) -> SessionEndResponse:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.ended_ts = now_ms()
    db.commit()
    return SessionEndResponse(ok=True)


@app.get("/sessions", response_model=list[SessionListItem])
def list_sessions(db: Session = Depends(get_db)) -> list[SessionListItem]:
    rows = (
        db.query(
            SessionModel.id,
            SessionModel.started_ts,
            SessionModel.ended_ts,
            SessionModel.label,
            func.count(EventModel.id).label("event_count"),
        )
        .outerjoin(EventModel, EventModel.session_id == SessionModel.id)
        .group_by(SessionModel.id)
        .order_by(desc(SessionModel.started_ts))
        .all()
    )

    return [
        SessionListItem(
            id=row.id,
            started_ts=row.started_ts,
            ended_ts=row.ended_ts,
            label=row.label,
            event_count=row.event_count,
        )
        for row in rows
    ]


@app.get("/sessions/{session_id}/events", response_model=list[EventOut])
def list_session_events(session_id: str, db: Session = Depends(get_db)) -> list[EventOut]:
    events = (
        db.query(EventModel)
        .filter(EventModel.session_id == session_id)
        .order_by(EventModel.ts.asc())
        .all()
    )
    return [
        EventOut(
            id=e.id,
            session_id=e.session_id,
            ts=e.ts,
            type=e.type,
            url=e.url,
            tab_id=e.tab_id,
            title=e.title,
            selector=e.selector,
            text=e.text,
            meta=e.meta or {},
        )
        for e in events
    ]


@app.post("/event", response_model=EventOut)
def ingest_event(payload: EventIn, db: Session = Depends(get_db)) -> EventOut:
    session = db.query(SessionModel).filter(SessionModel.id == payload.session_id).one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    event = EventModel(
        id=payload.id or str(uuid.uuid4()),
        session_id=payload.session_id,
        ts=payload.ts,
        type=payload.type,
        url=payload.url,
        tab_id=str(payload.tab_id) if payload.tab_id is not None else None,
        title=payload.title,
        selector=payload.selector,
        text=payload.text,
        meta=payload.meta or {},
    )

    db.add(event)
    db.flush()
    update_memory_from_event(db, event)
    db.commit()

    return EventOut(
        id=event.id,
        session_id=event.session_id,
        ts=event.ts,
        type=event.type,
        url=event.url,
        tab_id=event.tab_id,
        title=event.title,
        selector=event.selector,
        text=event.text,
        meta=event.meta or {},
    )


@app.get("/sessions/{session_id}/graph", response_model=GraphResponse)
def session_graph(session_id: str, db: Session = Depends(get_db)) -> GraphResponse:
    events = (
        db.query(EventModel)
        .filter(EventModel.session_id == session_id)
        .order_by(EventModel.ts.asc())
        .all()
    )

    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []

    for idx, event in enumerate(events):
        descriptor = event.selector or parse_path(event.url)
        text = (event.text or "").strip()[:30]
        label_bits = [event.type, descriptor]
        if text:
            label_bits.append(text)
        label = " | ".join(label_bits)

        node_id = event.id
        nodes.append(
            GraphNode(
                id=node_id,
                label=label,
                type="action",
                url=event.url,
                ts=event.ts,
            )
        )

        if idx > 0:
            prev_id = events[idx - 1].id
            edges.append(
                GraphEdge(
                    id=f"{prev_id}-{node_id}",
                    source=prev_id,
                    target=node_id,
                    label="next",
                )
            )

    return GraphResponse(nodes=nodes, edges=edges)


@app.get("/memory/search", response_model=list[MemoryItemOut])
def search_memory(
    q: str = Query(..., min_length=1),
    domain: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MemoryItemOut]:
    query = db.query(MemoryItemModel).filter(
        (MemoryItemModel.key.ilike(f"%{q}%")) | (MemoryItemModel.value.ilike(f"%{q}%"))
    )
    if domain:
        query = query.filter(MemoryItemModel.domain == domain)

    items = query.order_by(desc(MemoryItemModel.count), desc(MemoryItemModel.updated_ts)).limit(50).all()
    return [
        MemoryItemOut(
            id=i.id,
            user_id=i.user_id,
            domain=i.domain,
            kind=i.kind,
            key=i.key,
            value=i.value,
            count=i.count,
            updated_ts=i.updated_ts,
        )
        for i in items
    ]


@app.get("/memory/top", response_model=list[MemoryItemOut])
def top_memory(
    domain: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MemoryItemOut]:
    query = db.query(MemoryItemModel)
    if domain:
        query = query.filter(MemoryItemModel.domain == domain)

    items = query.order_by(desc(MemoryItemModel.count), desc(MemoryItemModel.updated_ts)).limit(20).all()
    return [
        MemoryItemOut(
            id=i.id,
            user_id=i.user_id,
            domain=i.domain,
            kind=i.kind,
            key=i.key,
            value=i.value,
            count=i.count,
            updated_ts=i.updated_ts,
        )
        for i in items
    ]


@app.get("/predict/next", response_model=PredictionOut)
def predict_next(session_id: str, db: Session = Depends(get_db)) -> PredictionOut:
    last_event = (
        db.query(EventModel)
        .filter(EventModel.session_id == session_id)
        .order_by(desc(EventModel.ts))
        .first()
    )
    if not last_event:
        return PredictionOut(suggestion="No events yet", confidence=0.0)

    domain = parse_domain(last_event.url)
    click_items = (
        db.query(MemoryItemModel)
        .filter(
            and_(
                MemoryItemModel.domain == domain,
                MemoryItemModel.kind == "frequent_action",
                MemoryItemModel.key.like("click:%"),
            )
        )
        .order_by(desc(MemoryItemModel.count))
        .all()
    )

    if not click_items:
        return PredictionOut(
            suggestion=f"Next likely: continue on {domain}",
            confidence=0.1,
        )

    top = click_items[0]
    total = sum(i.count for i in click_items)
    confidence = (top.count / total) if total > 0 else 0.0
    selector = top.key.replace("click:", "", 1)

    return PredictionOut(
        suggestion=f"Next likely: click {selector}",
        confidence=round(confidence, 2),
    )
