"use client";

import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";

import {
  EventItem,
  GraphResponse,
  MemoryItem,
  Prediction,
  getPrediction,
  getSessionEvents,
  getSessionGraph,
  getTopMemory,
  searchMemory,
} from "@/lib/api";

type Props = {
  sessionId: string;
};

function tsLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function eventIcon(type: string): string {
  if (type === "click") return "CLK";
  if (type === "input") return "IN";
  if (type === "url_changed") return "URL";
  if (type === "tab_activated") return "TAB";
  return "EVT";
}

function graphToFlow(graph: GraphResponse): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((node, idx) => ({
    id: node.id,
    position: { x: 60 + (idx % 2) * 260, y: 40 + idx * 110 },
    data: { label: node.label },
    style: {
      border: "1px solid #c5d0dc",
      borderRadius: 12,
      backgroundColor: "#fff",
      width: 230,
      fontSize: 12,
      padding: 8,
    },
  }));

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: true,
  }));

  return { nodes, edges };
}

export default function SessionDashboard({ sessionId }: Props) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [graph, setGraph] = useState<GraphResponse>({ nodes: [], edges: [] });
  const [prediction, setPrediction] = useState<Prediction>({ suggestion: "", confidence: 0 });
  const [topMemory, setTopMemory] = useState<MemoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<MemoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [eventData, graphData, predictData, topData] = await Promise.all([
          getSessionEvents(sessionId),
          getSessionGraph(sessionId),
          getPrediction(sessionId),
          getTopMemory(),
        ]);
        if (!mounted) {
          return;
        }
        setEvents(eventData);
        setGraph(graphData);
        setPrediction(predictData);
        setTopMemory(topData);
      } catch (e) {
        if (!mounted) {
          return;
        }
        setError(e instanceof Error ? e.message : "Failed loading session dashboard");
      }
    };

    load();
    const id = setInterval(load, 3000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [sessionId]);

  const flowData = useMemo(() => graphToFlow(graph), [graph]);

  const runSearch = async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await searchMemory(query);
      setSearchResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Memory search failed");
    }
  };

  return (
    <div className="grid h-[calc(100vh-110px)] grid-cols-12 gap-4">
      <section className="panel col-span-3 overflow-y-auto p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600">Event Timeline</h2>
        <div className="space-y-2">
          {events.map((event, idx) => {
            const prev = idx > 0 ? events[idx - 1] : null;
            const delta = prev ? `${event.ts - prev.ts}ms` : "start";
            return (
              <div key={event.id} className="rounded border border-line p-2 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-accent">{eventIcon(event.type)}</span>
                  <span>{tsLabel(event.ts)}</span>
                </div>
                <div className="font-medium">{event.type}</div>
                <div className="truncate text-slate-600">{event.selector || event.url || "-"}</div>
                {event.text && <div className="truncate text-slate-500">{event.text}</div>}
                <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">+{delta}</div>
              </div>
            );
          })}
          {events.length === 0 && <p className="text-xs text-slate-500">No events in this session yet.</p>}
        </div>
      </section>

      <section className="panel col-span-6 overflow-hidden p-2">
        <div className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider text-slate-600">Workflow Graph</div>
        <div className="h-[calc(100%-24px)] w-full rounded border border-line">
          <ReactFlow nodes={flowData.nodes} edges={flowData.edges} fitView>
            <Background color="#d4dee8" gap={18} />
            <Controls />
          </ReactFlow>
        </div>
      </section>

      <section className="panel col-span-3 overflow-y-auto p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600">Next Step</h2>
        <div className="mb-4 rounded border border-line p-3 text-sm">
          <p className="font-medium">{prediction.suggestion || "No prediction"}</p>
          <p className="text-xs text-slate-600">Confidence: {(prediction.confidence * 100).toFixed(0)}%</p>
        </div>

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600">Memory Search</h2>
        <div className="mb-3 flex gap-2">
          <input
            className="w-full rounded border border-line px-2 py-1 text-sm"
            placeholder="search memory..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="rounded bg-accent px-3 py-1 text-xs font-semibold text-white"
            onClick={runSearch}
            type="button"
          >
            Go
          </button>
        </div>

        <div className="mb-4 space-y-2">
          {searchResults.map((item) => (
            <div key={item.id} className="rounded border border-line p-2 text-xs">
              <div className="font-semibold">{item.key}</div>
              <div>{item.value}</div>
              <div className="text-slate-500">count={item.count}</div>
            </div>
          ))}
          {query && searchResults.length === 0 && <p className="text-xs text-slate-500">No matches</p>}
        </div>

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600">Top Memory</h2>
        <div className="space-y-2">
          {topMemory.map((item) => (
            <div key={item.id} className="rounded border border-line p-2 text-xs">
              <div className="font-semibold">{item.key}</div>
              <div className="truncate">{item.value}</div>
              <div className="text-slate-500">{item.domain} · {item.count}</div>
            </div>
          ))}
          {topMemory.length === 0 && <p className="text-xs text-slate-500">No memory items yet.</p>}
        </div>

        {error && <p className="mt-4 text-xs text-red-600">{error}</p>}
      </section>
    </div>
  );
}
