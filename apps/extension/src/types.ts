export type BrowserEventPayload = {
  id?: string;
  ts: number;
  type: string;
  url?: string;
  tab_id?: number | string;
  title?: string;
  selector?: string;
  text?: string;
  meta?: Record<string, unknown>;
};
