import { BrowserEventPayload } from "./types";

const API_BASE = "http://localhost:8000";

type RecorderState = {
  recording: boolean;
  sessionId: string | null;
};

async function getState(): Promise<RecorderState> {
  const data = await chrome.storage.local.get(["recording", "sessionId"]);
  return {
    recording: Boolean(data.recording),
    sessionId: data.sessionId ?? null,
  };
}

async function setState(next: RecorderState): Promise<void> {
  await chrome.storage.local.set({
    recording: next.recording,
    sessionId: next.sessionId,
  });
}

async function startRecording(label: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label || null }),
  });

  if (!res.ok) {
    return { ok: false, message: `Failed to start (${res.status})` };
  }

  const data = (await res.json()) as { session_id: string };
  await setState({ recording: true, sessionId: data.session_id });
  return { ok: true, message: `Recording ${data.session_id.slice(0, 8)}` };
}

async function stopRecording(): Promise<{ ok: boolean; message: string }> {
  const state = await getState();
  if (!state.sessionId) {
    await setState({ recording: false, sessionId: null });
    return { ok: true, message: "Stopped" };
  }

  await fetch(`${API_BASE}/sessions/${state.sessionId}/end`, { method: "POST" });
  await setState({ recording: false, sessionId: null });
  return { ok: true, message: "Stopped" };
}

async function postEvent(payload: BrowserEventPayload): Promise<void> {
  const state = await getState();
  if (!state.recording || !state.sessionId) {
    return;
  }

  const body = {
    ...payload,
    session_id: state.sessionId,
  };

  await fetch(`${API_BASE}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_RECORDING") {
    startRecording(message.label ?? "")
      .then(sendResponse)
      .catch((err: unknown) => sendResponse({ ok: false, message: String(err) }));
    return true;
  }

  if (message.type === "STOP_RECORDING") {
    stopRecording()
      .then(sendResponse)
      .catch((err: unknown) => sendResponse({ ok: false, message: String(err) }));
    return true;
  }

  if (message.type === "GET_STATUS") {
    getState()
      .then((state) => sendResponse({ ok: true, ...state }))
      .catch((err: unknown) => sendResponse({ ok: false, message: String(err) }));
    return true;
  }

  if (message.type === "EVENT_CAPTURED") {
    postEvent(message.payload).catch(() => undefined);
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  await postEvent({
    ts: Date.now(),
    type: "tab_activated",
    url: tab.url,
    tab_id: tabId,
    title: tab.title,
    meta: { windowId: tab.windowId },
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) {
    return;
  }
  await postEvent({
    ts: Date.now(),
    type: "url_changed",
    url: changeInfo.url,
    tab_id: tabId,
    title: tab.title,
    meta: { status: changeInfo.status },
  });
});
