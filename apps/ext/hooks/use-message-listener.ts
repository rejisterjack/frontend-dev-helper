import { useEffect } from "react";
import type { FDHMessage } from "@/lib/messaging/types";

export function useMessageListener(
  handler: (message: FDHMessage, sender: chrome.runtime.MessageSender) => void,
) {
  useEffect(() => {
    const listener = (
      message: unknown,
      sender: chrome.runtime.MessageSender,
    ) => {
      handler(message as FDHMessage, sender);
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [handler]);
}
