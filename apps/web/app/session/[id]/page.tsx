import Link from "next/link";

import SessionDashboard from "@/components/session-dashboard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-accent underline underline-offset-2">
            Back to sessions
          </Link>
          <h1 className="mt-1 text-xl font-bold">Session {id.slice(0, 8)}</h1>
        </div>
      </div>
      <SessionDashboard sessionId={id} />
    </main>
  );
}
