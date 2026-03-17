import { http } from '../lib/http';

type RealtimeCallbacks = {
  assessmentId: string;
  onProgress: (payload: { pct?: number; stage?: string }, eventId: number) => void;
  onFinal: (payload: unknown, eventId: number) => void;
  onError: (payload: { message?: string }, eventId: number) => void;
  onFallbackPoll: () => Promise<void>;
};

let socket: WebSocket | null = null;
let abortController: AbortController | null = null;

export function useAssessmentRealtime() {
  function stop() {
    abortController?.abort();
    abortController = null;
    socket?.close();
    socket = null;
  }

  async function stream(callbacks: RealtimeCallbacks) {
    stop();

    const token = localStorage.getItem('accessToken');
    if (!token) {
      await callbacks.onFallbackPoll();
      return;
    }

    let lastEventId = -1;
    let completed = false;
    let fallbackTriggered = false;

    const fallback = async () => {
      if (fallbackTriggered || completed) return;
      fallbackTriggered = true;
      socket?.close();
      await streamViaSse(callbacks, token, lastEventId);
    };

    const handleEvent = (event: {
      id?: number;
      type: string;
      data: unknown;
    }) => {
      const nextEventId = Number.isFinite(event.id) ? Number(event.id) : lastEventId;
      if (nextEventId >= 0) {
        lastEventId = nextEventId;
      }

      if (event.type === 'progress') {
        callbacks.onProgress(event.data as { pct?: number; stage?: string }, nextEventId);
        return;
      }

      if (event.type === 'final') {
        completed = true;
        callbacks.onFinal(event.data, nextEventId);
        stop();
        return;
      }

      if (event.type === 'error') {
        completed = true;
        callbacks.onError(event.data as { message?: string }, nextEventId);
        stop();
      }
    };

    try {
      const wsOrigin = resolveWsOrigin();
      socket = new WebSocket(`${wsOrigin}/ws/assessments?token=${encodeURIComponent(token)}`);
    } catch {
      await fallback();
      return;
    }

    const connectionTimer = window.setTimeout(() => {
      void fallback();
    }, 2500);

    await new Promise<void>((resolve) => {
      if (!socket) {
        resolve();
        return;
      }

      socket.onopen = () => {
        window.clearTimeout(connectionTimer);
        socket?.send(JSON.stringify({ action: 'subscribe', assessmentId: callbacks.assessmentId }));
      };

      socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data as string) as {
            type?: string;
            seq?: number;
            id?: number;
            data?: unknown;
            assessmentId?: string;
          };

          if (payload.type === 'connected') {
            return;
          }

          if (payload.assessmentId !== callbacks.assessmentId || !payload.type) {
            return;
          }

          handleEvent({
            id: payload.seq ?? payload.id,
            type: payload.type,
            data: payload.data,
          });

          if (completed) {
            resolve();
          }
        } catch {
          void fallback().then(resolve);
        }
      };

      socket.onerror = () => {
        window.clearTimeout(connectionTimer);
        void fallback().then(resolve);
      };

      socket.onclose = () => {
        window.clearTimeout(connectionTimer);
        if (!completed) {
          void fallback().then(resolve);
          return;
        }
        resolve();
      };
    });
  }

  return {
    stream,
    stop,
  };
}

async function streamViaSse(
  callbacks: RealtimeCallbacks,
  token: string,
  since: number,
) {
  abortController = new AbortController();
  const sinceQuery = since >= 0 ? `?since=${since}` : '';

  try {
    const response = await fetch(
      `${http.defaults.baseURL}/ai/assess/${callbacks.assessmentId}/stream${sinceQuery}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal,
      },
    );

    if (!response.ok || !response.body) {
      await callbacks.onFallbackPoll();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const lines = chunk.split('\n');
        let type = '';
        let data = '';
        let id = since;
        for (const line of lines) {
          if (line.startsWith('event: ')) type = line.slice(7);
          if (line.startsWith('data: ')) data = line.slice(6);
          if (line.startsWith('id: ')) id = Number(line.slice(4));
        }
        if (!data) continue;
        const payload = JSON.parse(data) as { message?: string };
        if (type === 'progress') callbacks.onProgress(payload as { pct?: number; stage?: string }, id);
        if (type === 'final') callbacks.onFinal(payload, id);
        if (type === 'error') callbacks.onError(payload, id);
      }
    }
  } catch {
    await callbacks.onFallbackPoll();
  }
}

function resolveWsOrigin() {
  const baseUrl = http.defaults.baseURL || 'http://localhost:3000/api/v1';
  const origin = baseUrl.replace(/\/api\/v1$/, '');
  return origin.replace(/^http/, 'ws');
}
