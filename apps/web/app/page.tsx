import Link from "next/link";

import { getSessions } from "@/lib/api";

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default async function HomePage() {
  const sessions = await getSessions();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ThirdLayer Sessions</h1>
        <span className="rounded bg-accent px-3 py-1 text-xs font-semibold text-white">
          {sessions.length} recorded
        </span>
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Ended</th>
              <th className="px-4 py-3">Events</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-t border-line hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/session/${session.id}`} className="text-accent underline underline-offset-2">
                    {session.label || session.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatTs(session.started_ts)}</td>
                <td className="px-4 py-3">{session.ended_ts ? formatTs(session.ended_ts) : "active"}</td>
                <td className="px-4 py-3">{session.event_count}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No sessions yet. Start recording from the extension popup.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
