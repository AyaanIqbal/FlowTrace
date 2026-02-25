export type SessionItem = {
  id: string;
  started_ts: number;
  ended_ts: number | null;
  label: string | null;
  event_count: number;
};

export type EventItem = {
  id: string;
  session_id: string;
  ts: number;
  type: string;
  url: string | null;
  tab_id: string | null;
  title: string | null;
  selector: string | null;
  text: string | null;
  meta: Record<string, unknown>;
};

export type GraphNode = {
  id: string;
  label: string;
  type: string;
  url: string | null;
  ts: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type MemoryItem = {
  id: string;
  user_id: string;
  domain: string;
  kind: string;
  key: string;
  value: string;
  count: number;
  updated_ts: number;
};

export type Prediction = {
  suggestion: string;
  confidence: number;
};

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function getSessions(): Promise<SessionItem[]> {
  const res = await fetch(`${API_BASE}/sessions`, { cache: "no-store" });
  return parseJson<SessionItem[]>(res);
}

export async function getSessionEvents(sessionId: string): Promise<EventItem[]> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/events`, { cache: "no-store" });
  return parseJson<EventItem[]>(res);
}

export async function getSessionGraph(sessionId: string): Promise<GraphResponse> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/graph`, { cache: "no-store" });
  return parseJson<GraphResponse>(res);
}

export async function getPrediction(sessionId: string): Promise<Prediction> {
  const res = await fetch(`${API_BASE}/predict/next?session_id=${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
  });
  return parseJson<Prediction>(res);
}

export async function getTopMemory(domain?: string): Promise<MemoryItem[]> {
  const url = new URL(`${API_BASE}/memory/top`);
  if (domain) {
    url.searchParams.set("domain", domain);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  return parseJson<MemoryItem[]>(res);
}

export async function searchMemory(q: string, domain?: string): Promise<MemoryItem[]> {
  const url = new URL(`${API_BASE}/memory/search`);
  url.searchParams.set("q", q);
  if (domain) {
    url.searchParams.set("domain", domain);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  return parseJson<MemoryItem[]>(res);
}
