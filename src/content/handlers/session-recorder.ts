import * as sessionRecorder from '../session-recorder';

export const sessionRecorderHandlers = {
  SESSION_RECORDER_START: (payload, _state, sendResponse) => {
    const { name, description } = (payload as { name?: string; description?: string }) || {};
    try {
      const session = sessionRecorder.startRecording(name || 'Session', description);
      sendResponse({ success: true, session });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  },
  SESSION_RECORDER_STOP: (_payload, _state, sendResponse) => {
    const session = sessionRecorder.stopRecording();
    sendResponse({ success: true, session });
  },
  SESSION_RECORDER_GET_STATE: (_payload, _state, sendResponse) => {
    sendResponse({ success: true, state: sessionRecorder.getState() });
  },
  SESSION_RECORDER_GET_SESSIONS: (_payload, _state, sendResponse) => {
    sessionRecorder.getSessions().then((sessions) => {
      sendResponse({ success: true, sessions });
    });
    return true;
  },
  SESSION_RECORDER_DELETE: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    sessionRecorder.deleteSession(id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  },
  SESSION_RECORDER_REPLAY: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    sessionRecorder.replaySession(id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  },
  SESSION_RECORDER_EXPORT: (payload, _state, sendResponse) => {
    const { session } = payload as { session: sessionRecorder.DebuggingSession };
    const json = sessionRecorder.exportSession(session);
    sendResponse({ success: true, json });
  },
  SESSION_RECORDER_IMPORT: (payload, _state, sendResponse) => {
    const { json } = payload as { json: string };
    try {
      const session = sessionRecorder.importSession(json);
      sendResponse({ success: true, session });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  },
  SESSION_RECORDER_SHARE: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    sessionRecorder.shareSession(id).then((url) => {
      sendResponse({ success: true, url });
    });
    return true;
  },
  SESSION_RECORDER_ADD_ANNOTATION: (payload, _state, sendResponse) => {
    const { text, selector } = payload as { text: string; selector?: string };
    sessionRecorder.addAnnotation(text, selector);
    sendResponse({ success: true });
  },
};
