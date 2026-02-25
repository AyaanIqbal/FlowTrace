from __future__ import annotations

from sqlalchemy import BigInteger, Column, Integer, JSON, String, Text

from .db import Base


class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    started_ts = Column(BigInteger, nullable=False, index=True)
    ended_ts = Column(BigInteger, nullable=True)
    label = Column(String, nullable=True)


class EventModel(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, nullable=False, index=True)
    ts = Column(BigInteger, nullable=False, index=True)
    type = Column(String, nullable=False, index=True)
    url = Column(Text, nullable=True)
    tab_id = Column(String, nullable=True)
    title = Column(Text, nullable=True)
    selector = Column(Text, nullable=True)
    text = Column(Text, nullable=True)
    meta = Column(JSON, nullable=True)


class MemoryItemModel(Base):
    __tablename__ = "memory_items"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    domain = Column(String, nullable=False, index=True)
    kind = Column(String, nullable=False, index=True)
    key = Column(String, nullable=False, index=True)
    value = Column(Text, nullable=False)
    count = Column(Integer, nullable=False, default=0)
    updated_ts = Column(BigInteger, nullable=False, index=True)
