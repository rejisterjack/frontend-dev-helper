import type { FDHMessage } from './types';

type MessageHandler = (
  message: FDHMessage,
  sender: browser.Runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => boolean | void;

const handlers = new Set<MessageHandler>();

export function onMessage(handler: MessageHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  for (const handler of handlers) {
    const result = handler(message as FDHMessage, sender, sendResponse);
    if (result === true) return true;
  }
  return false;
});
