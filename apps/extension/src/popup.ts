function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element ${id}`);
  }
  return node as T;
}

const status = el<HTMLParagraphElement>("status");
const label = el<HTMLInputElement>("label");

function setStatus(text: string): void {
  status.textContent = text;
}

async function refreshStatus(): Promise<void> {
  const result = (await chrome.runtime.sendMessage({ type: "GET_STATUS" })) as {
    ok: boolean;
    recording?: boolean;
    sessionId?: string | null;
    message?: string;
  };

  if (!result.ok) {
    setStatus(result.message ?? "Status error");
    return;
  }

  if (result.recording && result.sessionId) {
    setStatus(`Recording ${result.sessionId.slice(0, 8)}`);
  } else {
    setStatus("Idle");
  }
}

el<HTMLButtonElement>("start").addEventListener("click", async () => {
  const result = (await chrome.runtime.sendMessage({
    type: "START_RECORDING",
    label: label.value,
  })) as { ok: boolean; message: string };

  setStatus(result.message);
});

el<HTMLButtonElement>("stop").addEventListener("click", async () => {
  const result = (await chrome.runtime.sendMessage({ type: "STOP_RECORDING" })) as {
    ok: boolean;
    message: string;
  };

  setStatus(result.message);
});

void refreshStatus();
