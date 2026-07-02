import { describe, it, expect, beforeEach } from "vitest";
import {
  useChatSessionsStore,
  type ChatMessage,
} from "@/stores/use-chat-sessions-store";

function makeMessage(
  content: string,
  id: string = crypto.randomUUID(),
): ChatMessage {
  return { id, role: "user", content, timestamp: Date.now() };
}

describe("useChatSessionsStore", () => {
  beforeEach(() => {
    useChatSessionsStore.setState({ sessions: [], activeSessionId: null });
  });

  it("createSession returns a new id and activates it", () => {
    const id = useChatSessionsStore.getState().createSession();
    expect(id).toBeTruthy();
    const s = useChatSessionsStore.getState();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].id).toBe(id);
    expect(s.activeSessionId).toBe(id);
    expect(s.sessions[0].title).toBe("New Chat");
  });

  it("deleteSession promotes the next session when the active one is removed", () => {
    const a = useChatSessionsStore.getState().createSession();
    const b = useChatSessionsStore.getState().createSession();
    // active is b
    useChatSessionsStore.getState().deleteSession(b);
    const s = useChatSessionsStore.getState();
    expect(s.sessions.find((x) => x.id === b)).toBeUndefined();
    expect(s.activeSessionId).toBe(a);
  });

  it("deleteSession leaves activeSessionId null when no sessions remain", () => {
    const a = useChatSessionsStore.getState().createSession();
    useChatSessionsStore.getState().deleteSession(a);
    expect(useChatSessionsStore.getState().activeSessionId).toBeNull();
  });

  it("switchSession only changes activeSessionId", () => {
    const a = useChatSessionsStore.getState().createSession();
    const b = useChatSessionsStore.getState().createSession();
    useChatSessionsStore.getState().switchSession(a);
    expect(useChatSessionsStore.getState().activeSessionId).toBe(a);
    useChatSessionsStore.getState().switchSession(b);
    expect(useChatSessionsStore.getState().activeSessionId).toBe(b);
  });

  it("addMessage appends to the right session", () => {
    const id = useChatSessionsStore.getState().createSession();
    const msg = makeMessage("hi");
    useChatSessionsStore.getState().addMessage(id, msg);
    const session = useChatSessionsStore
      .getState()
      .sessions.find((s) => s.id === id);
    expect(session?.messages).toHaveLength(1);
    expect(session?.messages[0]).toEqual(msg);
  });

  it("updateMessage merges into the targeted message", () => {
    const id = useChatSessionsStore.getState().createSession();
    const msg = makeMessage("hi", "m1");
    useChatSessionsStore.getState().addMessage(id, msg);
    useChatSessionsStore
      .getState()
      .updateMessage(id, "m1", { content: "hi (edited)" });
    const session = useChatSessionsStore
      .getState()
      .sessions.find((s) => s.id === id);
    expect(session?.messages[0].content).toBe("hi (edited)");
  });

  it("clearSession empties messages but keeps the session", () => {
    const id = useChatSessionsStore.getState().createSession();
    useChatSessionsStore.getState().addMessage(id, makeMessage("hi"));
    useChatSessionsStore.getState().clearSession(id);
    const session = useChatSessionsStore
      .getState()
      .sessions.find((s) => s.id === id);
    expect(session?.messages).toEqual([]);
  });

  it("getActiveSession returns the session matching activeSessionId", () => {
    const id = useChatSessionsStore.getState().createSession();
    const active = useChatSessionsStore.getState().getActiveSession();
    expect(active?.id).toBe(id);
  });

  it('autoTitleSession renames a "New Chat" title from the first message', () => {
    const id = useChatSessionsStore.getState().createSession();
    useChatSessionsStore
      .getState()
      .autoTitleSession(id, "How do I center a div?");
    expect(useChatSessionsStore.getState().sessions[0].title).toBe(
      "How do I center a div?",
    );
  });

  it("autoTitleSession truncates long messages and adds ellipsis", () => {
    const id = useChatSessionsStore.getState().createSession();
    const long = "x".repeat(100);
    useChatSessionsStore.getState().autoTitleSession(id, long);
    const title = useChatSessionsStore.getState().sessions[0].title;
    expect(title.endsWith("...")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(43); // 40 chars + ellipsis
  });

  it("autoTitleSession is a no-op once the title has been customized", () => {
    const id = useChatSessionsStore.getState().createSession();
    useChatSessionsStore.getState().autoTitleSession(id, "first");
    useChatSessionsStore.getState().autoTitleSession(id, "second");
    expect(useChatSessionsStore.getState().sessions[0].title).toBe("first");
  });
});
