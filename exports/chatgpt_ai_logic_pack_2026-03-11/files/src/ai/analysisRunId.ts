import { getJson, setJson } from '../data/storage/storage';

const ANALYSIS_COUNTER_KEY = 'buddy_analysis_counter_v1';

type AnalysisCounterState = {
  lastIssuedId: number;
};

const INITIAL_COUNTER_STATE: AnalysisCounterState = {
  lastIssuedId: 0,
};

let issueQueue: Promise<number> = Promise.resolve(0);

/**
 * Returns a strictly increasing analysis id on this installation.
 * IDs are persisted so they survive app restarts.
 */
export function nextAnalysisRunId(): Promise<number> {
  issueQueue = issueQueue.then(async () => {
    const current = await getJson<AnalysisCounterState>(
      ANALYSIS_COUNTER_KEY,
      INITIAL_COUNTER_STATE
    );
    const nextId = Math.max(0, Math.floor(current.lastIssuedId || 0)) + 1;
    await setJson<AnalysisCounterState>(ANALYSIS_COUNTER_KEY, {
      lastIssuedId: nextId,
    });
    return nextId;
  });
  return issueQueue;
}

export async function getLastAnalysisRunId(): Promise<number> {
  const current = await getJson<AnalysisCounterState>(
    ANALYSIS_COUNTER_KEY,
    INITIAL_COUNTER_STATE
  );
  return Math.max(0, Math.floor(current.lastIssuedId || 0));
}
