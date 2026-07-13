import Link from 'next/link';
import { AppHeader } from '../components/app-header';

async function getTodayPractice() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(`${apiBase}/practice/today`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    return res.json() as Promise<{
      date: string;
      newQuestion: { questionId: string; content: string; topic: string; difficulty: string; alreadyCompleted: boolean };
      dueReviews: unknown[];
    }>;
  } catch {
    return {
      date: new Date().toISOString().slice(0, 10),
      newQuestion: {
        questionId: '11111111-1111-1111-1111-111111111111',
        content: 'Do you enjoy drinking coffee?',
        topic: 'Food and drink',
        difficulty: 'easy',
        alreadyCompleted: false,
      },
      dueReviews: [],
    };
  }
}

export default async function HomePage() {
  const today = await getTodayPractice();

  return (
    <>
      <AppHeader active="today" />
      <main className="page-shell">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Daily plan</p>
            <h1 className="page-title">Today&apos;s practice</h1>
            <p className="page-subtitle">One focused answer, followed by the reviews that matter most.</p>
          </div>
          <div className="date-block">
            <strong>{today.date}</strong>
            <span>Asia / Shanghai</span>
          </div>
        </header>

        <section className="metric-strip" aria-label="Learning summary">
          <div className="metric">
            <span className="metric__label">Current streak</span>
            <span className="metric__value">1 <small>day</small></span>
          </div>
          <div className="metric">
            <span className="metric__label">Latest estimate</span>
            <span className="metric__value">6.5 <small>band</small></span>
          </div>
          <div className="metric">
            <span className="metric__label">Weekly answers</span>
            <span className="metric__value">3 <small>of 7</small></span>
          </div>
          <div className="metric">
            <span className="metric__label">Due reviews</span>
            <span className="metric__value">{today.dueReviews.length}</span>
          </div>
        </section>

        <section className="today-grid">
          <article className="practice-brief">
            <div className="brief-meta">
              <span className="status-label">Ready</span>
              <span>IELTS Speaking Part 1</span>
              <span>{today.newQuestion.topic}</span>
              <span>{today.newQuestion.difficulty}</span>
            </div>
            <h2 className="brief-question">{today.newQuestion.content}</h2>
            <div className="brief-footer">
              <p className="brief-note">Suggested answer time: 30-45 seconds</p>
              <Link className="button button--primary" href={`/practice/session/new?questionId=${today.newQuestion.questionId}`}>
                Start practice
              </Link>
            </div>
          </article>

          <aside className="review-panel">
            <p className="panel-kicker">Review queue</p>
            <p className="review-count">{today.dueReviews.length}</p>
            <p className="review-count-label">items due today</p>
            <p className="review-empty">
              {today.dueReviews.length === 0
                ? 'You are caught up. New review items appear after an assessed answer.'
                : 'Complete your due reviews after today\'s speaking answer.'}
            </p>
          </aside>
        </section>

        <section className="focus-band" aria-labelledby="focus-title">
          <div>
            <p className="panel-kicker">Recent profile</p>
            <h2 id="focus-title">Scoring focus</h2>
          </div>
          <div>
            <div className="focus-item">
              <span>Fluency</span><span className="focus-track"><span className="focus-fill" style={{ width: '67%' }} /></span><strong>6.0</strong>
            </div>
            <div className="focus-item">
              <span>Vocabulary</span><span className="focus-track"><span className="focus-fill" style={{ width: '72%' }} /></span><strong>6.5</strong>
            </div>
            <div className="focus-item">
              <span>Coherence</span><span className="focus-track"><span className="focus-fill" style={{ width: '72%' }} /></span><strong>6.5</strong>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
