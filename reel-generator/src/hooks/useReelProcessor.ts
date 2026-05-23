import { useState, useCallback } from 'react';
import { generateReel, ProcessingProgress } from '../utils/ffmpegCommands';
import { MediaItem } from '../types';

type Status = 'idle' | 'processing' | 'done' | 'error';

export function useReelProcessor() {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [outputUri, setOutputUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(async (items: MediaItem[]) => {
    setStatus('processing');
    setError(null);
    setOutputUri(null);

    const result = await generateReel(items, (p) => setProgress(p));

    if (result) {
      setOutputUri(result);
      setStatus('done');
    } else {
      setError('שגיאה בעיבוד הריל. אנא נסה שוב.');
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setOutputUri(null);
    setError(null);
  }, []);

  return { status, progress, outputUri, error, process, reset };
}
