import { BrowserEventPayload } from "./types";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function cssSelector(el: Element | null): string {
  if (!el) return "unknown";
  if (el.id) return `#${el.id}`;

  const tag = el.tagName.toLowerCase();
  if (el.classList.length > 0) {
    return `${tag}.${Array.from(el.classList).slice(0, 3).join(".")}`;
  }

  const parent = el.parentElement;
  if (!parent) {
    return tag;
  }

  const siblings = Array.from(parent.children).filter((s) => s.tagName === el.tagName);
  const index = siblings.indexOf(el) + 1;
  return `${tag}:nth-child(${index})`;
}

function send(payload: BrowserEventPayload): void {
  chrome.runtime.sendMessage({ type: "EVENT_CAPTURED", payload });
}

document.addEventListener(
  "click",
  (event) => {
    const target = event.target as Element | null;
    const text = target instanceof HTMLElement ? target.innerText || "" : "";

    send({
      ts: Date.now(),
      type: "click",
      url: location.href,
      title: document.title,
      selector: cssSelector(target),
      text: truncate(text.trim(), 60),
      meta: {
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY,
      },
    });
  },
  true,
);

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
  if (!target) return;

  const raw = target.value || "";
  send({
    ts: Date.now(),
    type: "input",
    url: location.href,
    title: document.title,
    selector: cssSelector(target),
    text: truncate(raw, 60),
    meta: {
      value_length: raw.length,
      input_type: target.type || "text",
      source: event.type,
    },
  });
}

document.addEventListener("input", handleInput, true);
document.addEventListener("change", handleInput, true);

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter" || (event.metaKey && event.key.toLowerCase() === "k")) {
      send({
        ts: Date.now(),
        type: "keyboard_shortcut",
        url: location.href,
        title: document.title,
        selector: cssSelector(event.target as Element | null),
        text: event.key,
        meta: {
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
        },
      });
    }
  },
  true,
);
