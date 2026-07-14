'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from '../../../../components/app-header';

type Step = 'record' | 'transcribing' | 'transcript' | 'assessing' | 'feedback';
type Feedback = { bandScore: number; grammarScore: number; vocabularyScore: number; fluencyScore: number; coherenceScore: number; band7Version: string };
type Session = { status: string; transcript?: { rawText: string; editedText?: string }; feedback?: Feedback; error?: { message: string } };

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) } });
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function PracticeSessionContent() {
  const searchParams = useSearchParams();
  const questionId = searchParams.get('questionId');
  const [step, setStep] = useState<Step>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string>();
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<Feedback>();
  const [error, setError] = useState<string>();
  const recorder = useRef<MediaRecorder | undefined>(undefined);
  const stream = useRef<MediaStream | undefined>(undefined);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => Math.min(value + 1, 90)), 1_000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), []);

  const wordCount = useMemo(() => transcript.trim().split(/\s+/).filter(Boolean).length, [transcript]);
  const stageIndex = step === 'record' ? 0 : step === 'transcribing' || step === 'transcript' ? 1 : 2;
  const scoreRows = feedback ? [
    { label: 'Grammar', score: feedback.grammarScore }, { label: 'Vocabulary', score: feedback.vocabularyScore },
    { label: 'Fluency', score: feedback.fluencyScore }, { label: 'Coherence', score: feedback.coherenceScore },
  ] : [];

  async function waitForSession(id: string, target: 'transcribed' | 'completed') {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const session = await request<Session>(`/practice/sessions/${id}`);
      if (session.status === 'failed') throw new Error(session.error?.message ?? 'Processing failed');
      if (target === 'transcribed' && session.status === 'transcribed' && session.transcript) return session;
      if (target === 'completed' && session.status === 'completed' && session.feedback) return session;
      await new Promise((resolve) => window.setTimeout(resolve, 2_000));
    }
    throw new Error('Processing took too long. You can return to Today and resume this session.');
  }

  async function uploadRecording(blob: Blob, id: string) {
    setStep('transcribing');
    const upload = await request<{ uploadUrl: string; storageKey: string }>(`/practice/sessions/${id}/upload-url`, { method: 'POST' });
    const uploadResponse = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob });
    if (!uploadResponse.ok) throw new Error(`Audio upload failed (${uploadResponse.status})`);
    await request(`/practice/sessions/${id}/audio/complete`, {
      method: 'POST', body: JSON.stringify({ storageKey: upload.storageKey, mimeType: blob.type || 'audio/webm', sizeBytes: blob.size, durationMs: Math.max(elapsedSeconds * 1000, 5_000) }),
    });
    const completed = await waitForSession(id, 'transcribed');
    setTranscript(completed.transcript?.rawText ?? '');
    setStep('transcript');
  }

  async function startRecording() {
    try {
      if (!questionId) throw new Error('A practice question is required. Return to Today and start again.');
      setError(undefined);
      const created = sessionId ? { sessionId } : await request<{ sessionId: string }>('/practice/sessions', { method: 'POST', body: JSON.stringify({ questionId }) });
      setSessionId(created.sessionId);
      const activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = activeStream;
      chunks.current = [];
      const activeRecorder = new MediaRecorder(activeStream);
      recorder.current = activeRecorder;
      activeRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      activeRecorder.onstop = () => {
        activeStream.getTracks().forEach((track) => track.stop());
        void uploadRecording(new Blob(chunks.current, { type: activeRecorder.mimeType || 'audio/webm' }), created.sessionId).catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : 'Audio processing failed'); setStep('record');
        });
      };
      setElapsedSeconds(0);
      activeRecorder.start();
      setIsRecording(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Microphone access failed');
    }
  }

  function finishRecording() {
    setIsRecording(false);
    recorder.current?.stop();
  }

  async function confirmTranscript() {
    if (!sessionId) return;
    try {
      setError(undefined); setStep('assessing');
      await request(`/practice/sessions/${sessionId}/transcript`, { method: 'PATCH', body: JSON.stringify({ text: transcript, confirmed: true }) });
      await request(`/practice/sessions/${sessionId}/assess`, { method: 'POST' });
      const completed = await waitForSession(sessionId, 'completed');
      setFeedback(completed.feedback); setStep('feedback');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Assessment failed'); setStep('transcript');
    }
  }

  return <>
    <AppHeader active="practice" />
    <main className="session-shell">
      <div className="session-topline"><Link href="/">Today / Practice</Link><span className="session-status">{sessionId ? 'Saved session' : 'New session'}</span></div>
      <div className="session-layout">
        <aside className="session-sidebar">
          <p className="session-topic">IELTS Speaking Part 1</p><h1 className="session-question">Record a clear answer to today&apos;s question.</h1><p className="session-id">{sessionId ? `Session ${sessionId.slice(0, 8)}` : 'Your recording stays private.'}</p>
          <ol className="session-steps" aria-label="Practice progress">{['Answer', 'Transcript', 'Feedback'].map((label, index) => <li className={`session-step ${index < stageIndex ? 'is-complete' : index === stageIndex ? 'is-active' : ''}`} key={label}><span className="session-step__index">{index < stageIndex ? 'OK' : index + 1}</span><span>{label}</span></li>)}</ol>
        </aside>
        <section className="session-panel" aria-live="polite">
          {error && <p role="alert">{error}</p>}
          {step === 'record' && <><header className="stage-header"><div><h1>Record your answer</h1><p>Aim for one clear idea with a reason or example.</p></div><span className="stage-counter">{formatTimer(elapsedSeconds)}</span></header><div className="recording-stage"><div className={isRecording ? 'recording-stage__disc is-recording' : 'recording-stage__disc'} /><h2>{isRecording ? 'Recording in progress' : 'Ready when you are'}</h2><p>{isRecording ? 'Finish when you have answered. Recording stops at 90 seconds.' : 'Suggested answer time: 30-45 seconds.'}</p><button className={isRecording ? 'button button--secondary' : 'button button--record'} onClick={isRecording ? finishRecording : startRecording} type="button">{isRecording ? 'Finish recording' : 'Start recording'}</button></div></>}
          {step === 'transcribing' && <><header className="stage-header"><div><h1>Transcribing your answer</h1><p>Your audio was uploaded securely and is being converted to text.</p></div><span className="status-label">Processing</span></header><div className="assessment-stage"><div className="assessment-stage__inner"><div className="processing-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div><h2>Preparing your transcript</h2><p>This usually takes a few seconds.</p></div></div></>}
          {step === 'transcript' && <><header className="stage-header"><div><h1>Confirm your transcript</h1><p>Assessment uses the confirmed wording below.</p></div><span className="stage-counter">{wordCount} words</span></header><div className="transcript-editor"><label htmlFor="transcript">Your answer</label><textarea id="transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} /><div className="editor-footer"><span className="word-count">Recorded length {formatTimer(Math.max(elapsedSeconds, 5))}</span><div className="stage-actions__buttons"><button className="button button--primary" disabled={!wordCount} onClick={() => void confirmTranscript()} type="button">Confirm transcript</button></div></div></div></>}
          {step === 'assessing' && <><header className="stage-header"><div><h1>Assessing your answer</h1><p>Grammar, vocabulary, fluency, and coherence.</p></div><span className="status-label">Processing</span></header><div className="assessment-stage"><div className="assessment-stage__inner"><div className="processing-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div><h2>Your feedback is nearly ready</h2><p>Your confirmed response is being assessed against IELTS speaking dimensions.</p></div></div></>}
          {step === 'feedback' && feedback && <><header className="stage-header"><div><h1>Answer feedback</h1><p>Estimated IELTS Speaking performance.</p></div><span className="status-label">Complete</span></header><div className="feedback-layout"><div className="feedback-summary"><div className="band-score"><span>Estimated band</span><strong>{feedback.bandScore.toFixed(1)}</strong></div><div className="score-list">{scoreRows.map((item) => <div className="score-item" key={item.label}><span>{item.label}</span><span className="score-track"><span className="score-fill" style={{ width: `${(item.score / 9) * 100}%` }} /></span><strong>{item.score.toFixed(1)}</strong></div>)}</div></div><div className="better-answer"><p className="better-answer__label">Band 7 target</p><h2>A stronger version</h2><blockquote>{feedback.band7Version}</blockquote></div><div className="stage-actions"><span className="word-count">Saved to today&apos;s practice history</span><div className="stage-actions__buttons"><Link className="button button--primary" href="/">Back to today</Link></div></div></div></>}
        </section>
      </div>
    </main>
  </>;
}

export default function NewPracticeSessionPage() {
  return <Suspense fallback={null}><PracticeSessionContent /></Suspense>;
}
