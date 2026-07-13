'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../../../../components/app-header';

type Step = 'record' | 'transcript' | 'assessing' | 'feedback';

const scoreRows = [
  { label: 'Grammar', score: 6.5 },
  { label: 'Vocabulary', score: 6.5 },
  { label: 'Fluency', score: 6.0 },
  { label: 'Coherence', score: 6.5 },
];

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function PracticeSessionContent() {
  const searchParams = useSearchParams();
  const questionId = searchParams.get('questionId') ?? 'Not assigned';
  const [step, setStep] = useState<Step>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState(
    'Yes, I enjoy drinking coffee because it helps me focus in the morning.',
  );

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => Math.min(value + 1, 90)), 1_000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (elapsedSeconds < 90 || !isRecording) return;
    setIsRecording(false);
    setStep('transcript');
  }, [elapsedSeconds, isRecording]);

  const wordCount = useMemo(() => transcript.trim().split(/\s+/).filter(Boolean).length, [transcript]);
  const stageIndex = step === 'record' ? 0 : step === 'transcript' ? 1 : 2;

  function handleRecording() {
    if (!isRecording) {
      setElapsedSeconds(0);
      setIsRecording(true);
      return;
    }
    setIsRecording(false);
    setStep('transcript');
  }

  function returnToRecording() {
    setIsRecording(false);
    setElapsedSeconds(0);
    setStep('record');
  }

  return (
    <>
      <AppHeader active="practice" />
      <main className="session-shell">
        <div className="session-topline">
          <Link href="/">Today / Practice</Link>
          <span className="session-status">Demo session</span>
        </div>

        <div className="session-layout">
          <aside className="session-sidebar">
            <p className="session-topic">Food and drink · Part 1</p>
            <h1 className="session-question">Do you enjoy drinking coffee?</h1>
            <p className="session-id">Question {questionId}</p>

            <ol className="session-steps" aria-label="Practice progress">
              {['Answer', 'Transcript', 'Feedback'].map((label, index) => {
                const state = index < stageIndex ? 'is-complete' : index === stageIndex ? 'is-active' : '';
                return (
                  <li className={`session-step ${state}`} key={label}>
                    <span className="session-step__index">{index < stageIndex ? 'OK' : index + 1}</span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>
          </aside>

          <section className="session-panel" aria-live="polite">
            {step === 'record' && (
              <>
                <header className="stage-header">
                  <div>
                    <h1>Record your answer</h1>
                    <p>Aim for one clear idea with a reason or example.</p>
                  </div>
                  <span className="stage-counter">{formatTimer(elapsedSeconds)}</span>
                </header>
                <div className="recording-stage">
                  <div className={isRecording ? 'recording-stage__disc is-recording' : 'recording-stage__disc'} />
                  <h2>{isRecording ? 'Recording in progress' : 'Ready when you are'}</h2>
                  <p>{isRecording ? 'Keep speaking naturally. Recording stops automatically at 90 seconds.' : 'Suggested answer time: 30-45 seconds.'}</p>
                  <button className={isRecording ? 'button button--secondary' : 'button button--record'} onClick={handleRecording} type="button">
                    {isRecording ? 'Finish recording' : 'Start recording'}
                  </button>
                </div>
              </>
            )}

            {step === 'transcript' && (
              <>
                <header className="stage-header">
                  <div>
                    <h1>Confirm your transcript</h1>
                    <p>Assessment uses the confirmed wording below.</p>
                  </div>
                  <span className="stage-counter">{wordCount} words</span>
                </header>
                <div className="transcript-editor">
                  <label htmlFor="transcript">Your answer</label>
                  <textarea
                    id="transcript"
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                  />
                  <div className="editor-footer">
                    <span className="word-count">Recorded length {formatTimer(Math.max(elapsedSeconds, 12))}</span>
                    <div className="stage-actions__buttons">
                      <button className="button button--secondary" onClick={returnToRecording} type="button">Record again</button>
                      <button
                        className="button button--primary"
                        disabled={wordCount === 0}
                        onClick={() => setStep('assessing')}
                        type="button"
                      >
                        Confirm transcript
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 'assessing' && (
              <>
                <header className="stage-header">
                  <div>
                    <h1>Assessing your answer</h1>
                    <p>Grammar, vocabulary, fluency, and coherence.</p>
                  </div>
                  <span className="status-label">Processing</span>
                </header>
                <div className="assessment-stage">
                  <div className="assessment-stage__inner">
                    <div className="processing-bars" aria-hidden="true">
                      <span /><span /><span /><span /><span />
                    </div>
                    <h2>Your feedback is nearly ready</h2>
                    <p>Your response is being checked against the four speaking dimensions.</p>
                    <button className="button button--primary" onClick={() => setStep('feedback')} type="button">View feedback</button>
                  </div>
                </div>
              </>
            )}

            {step === 'feedback' && (
              <>
                <header className="stage-header">
                  <div>
                    <h1>Answer feedback</h1>
                    <p>Estimated IELTS Speaking performance.</p>
                  </div>
                  <span className="status-label">Complete</span>
                </header>
                <div className="feedback-layout">
                  <div className="feedback-summary">
                    <div className="band-score">
                      <span>Estimated band</span>
                      <strong>6.5</strong>
                    </div>
                    <div className="score-list">
                      {scoreRows.map((item) => (
                        <div className="score-item" key={item.label}>
                          <span>{item.label}</span>
                          <span className="score-track">
                            <span className="score-fill" style={{ width: `${(item.score / 9) * 100}%` }} />
                          </span>
                          <strong>{item.score.toFixed(1)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="better-answer">
                    <p className="better-answer__label">Band 7 target</p>
                    <h2>A stronger version</h2>
                    <blockquote>
                      Yes, I enjoy drinking coffee, especially in the morning. It keeps me alert and has become a small but important part of my daily routine.
                    </blockquote>
                  </div>
                  <div className="stage-actions">
                    <span className="word-count">Saved to today&apos;s practice history</span>
                    <div className="stage-actions__buttons">
                      <button className="button button--secondary" onClick={returnToRecording} type="button">Try again</button>
                      <Link className="button button--primary" href="/">Back to today</Link>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default function NewPracticeSessionPage() {
  return (
    <Suspense fallback={<main className="session-shell">Loading practice session...</main>}>
      <PracticeSessionContent />
    </Suspense>
  );
}
