import Link from 'next/link';

async function getTodayPractice() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(`${apiBase}/practice/today`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    return res.json() as Promise<{
      date: string;
      newQuestion: { questionId: string; content: string; topic: string; alreadyCompleted: boolean };
      dueReviews: unknown[];
    }>;
  } catch {
    return {
      date: new Date().toISOString().slice(0, 10),
      newQuestion: {
        questionId: '11111111-1111-1111-1111-111111111111',
        content: 'Do you enjoy drinking coffee?',
        topic: 'Food and drink',
        alreadyCompleted: false,
      },
      dueReviews: [],
    };
  }
}

export default async function HomePage() {
  const today = await getTodayPractice();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-8 py-10">
      <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">SpeakingOS MVP</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Practice one answer. Build long-term memory.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Today&apos;s loop: record, confirm transcript, get feedback, save memory, and schedule review.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">{today.date} · IELTS Speaking Part 1 · {today.newQuestion.topic}</p>
          <h2 className="mt-3 text-2xl font-semibold">{today.newQuestion.content}</h2>
          <Link
            href={`/practice/session/new?questionId=${today.newQuestion.questionId}`}
            className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500"
          >
            Start practice
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold">Due reviews</h2>
          <p className="mt-3 text-4xl font-bold">{today.dueReviews.length}</p>
          <p className="mt-2 text-slate-600">Review tasks will appear here after completed sessions.</p>
        </div>
      </section>
    </main>
  );
}
