'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

type Step = 'record' | 'transcript' | 'assessing' | 'feedback';

function PracticeSessionContent() {
  const searchParams = useSearchParams();
  const questionId = searchParams.get('questionId');
  const [step, setStep] = useState<Step>('record');
  const [transcript, setTranscript] = useState(
    'Yes, I enjoy drinking coffee because it helps me focus in the morning.',
  );

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-8 py-10">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Question ID: {questionId}</p>
        <h1 className="mt-3 text-3xl font-bold">Do you enjoy drinking coffee?</h1>

        {step === 'record' && (
          <section className="mt-8 space-y-4">
            <p className="text-slate-600">Recorder placeholder. The next iteration wires MediaRecorder + signed upload.</p>
            <button
              className="rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white"
              onClick={() => setStep('transcript')}
            >
              Simulate STT result
            </button>
          </section>
        )}

        {step === 'transcript' && (
          <section className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-slate-700">Confirm transcript before assessment</label>
            <textarea
              className="min-h-40 w-full rounded-2xl border border-slate-300 p-4"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
            />
            <button
              className="rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white"
              onClick={() => setStep('assessing')}
            >
              Confirm and assess
            </button>
          </section>
        )}

        {step === 'assessing' && (
          <section className="mt-8 space-y-4">
            <p className="text-slate-600">Assessment job placeholder.</p>
            <button
              className="rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white"
              onClick={() => setStep('feedback')}
            >
              Show fake feedback
            </button>
          </section>
        )}

        {step === 'feedback' && (
          <section className="mt-8 grid gap-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Estimated band</p>
              <p className="text-4xl font-bold">6.5</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <h2 className="font-semibold">Band 7 version</h2>
              <p className="mt-2 text-slate-700">
                Yes, I enjoy drinking coffee, especially in the morning. It keeps me alert and has become a small but important part of my daily routine.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function NewPracticeSessionPage() {
  return (
    <Suspense fallback={<div className="mx-auto min-h-screen max-w-4xl px-8 py-10">Loading...</div>}>
      <PracticeSessionContent />
    </Suspense>
  );
}
