import { describe, expect, it } from "vitest";
import { groupNotifications } from "./notificationGrouping";
import type { NotificationWithActor } from "@/lib/database.types";

function makeNotif(
  overrides: Partial<NotificationWithActor>,
): NotificationWithActor {
  return {
    id: "n1",
    user_id: "u1",
    type: "system",
    title: "Test",
    body: null,
    related_user_id: null,
    related_conversation_id: null,
    related_friendship_id: null,
    related_post_id: null,
    related_reel_id: null,
    related_reel_comment_id: null,
    href: null,
    read_at: null,
    created_at: new Date().toISOString(),
    actor: null,
    ...overrides,
  };
}

describe("groupNotifications", () => {
  it("returns empty array for empty input", () => {
    expect(groupNotifications([])).toEqual([]);
  });

  it("does NOT group new_message (1-on-1 conversations restent séparées)", () => {
    const a = makeNotif({
      id: "1",
      type: "new_message",
      href: "/messages/conv-1",
      created_at: "2026-05-09T12:00:00Z",
    });
    const b = makeNotif({
      id: "2",
      type: "new_message",
      href: "/messages/conv-1",
      created_at: "2026-05-09T11:00:00Z",
    });
    const result = groupNotifications([a, b]);
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.count === 1)).toBe(true);
  });

  it("groups same-type same-href notifications within 24h window", () => {
    const a = makeNotif({
      id: "1",
      type: "system" as const,
      title: "Alice a aimé ton post",
      href: "/feed/post-1",
      created_at: "2026-05-09T12:00:00Z",
      actor: { id: "u-alice", full_name: "Alice", username: "alice", avatar_url: null },
    });
    const b = makeNotif({
      id: "2",
      type: "system" as const,
      title: "Bob a aimé ton post",
      href: "/feed/post-1",
      created_at: "2026-05-09T11:00:00Z",
      actor: { id: "u-bob", full_name: "Bob", username: "bob", avatar_url: null },
    });
    const c = makeNotif({
      id: "3",
      type: "system" as const,
      title: "Charlie a aimé ton post",
      href: "/feed/post-1",
      created_at: "2026-05-09T10:00:00Z",
      actor: {
        id: "u-charlie",
        full_name: "Charlie",
        username: "charlie",
        avatar_url: null,
      },
    });
    const result = groupNotifications([a, b, c]);
    expect(result).toHaveLength(1);
    expect(result[0]!.count).toBe(3);
    expect(result[0]!.actors).toHaveLength(3);
    expect(result[0]!.notification_ids).toEqual(["1", "2", "3"]);
  });

  it("does NOT group across the 24h window", () => {
    const a = makeNotif({
      id: "1",
      type: "system" as const,
      href: "/feed/post-1",
      created_at: "2026-05-09T12:00:00Z",
      actor: { id: "u-a", full_name: "A", username: "a", avatar_url: null },
    });
    const b = makeNotif({
      id: "2",
      type: "system" as const,
      href: "/feed/post-1",
      /* > 24h plus ancien que `a`. */
      created_at: "2026-05-07T11:00:00Z",
      actor: { id: "u-b", full_name: "B", username: "b", avatar_url: null },
    });
    const result = groupNotifications([a, b]);
    expect(result).toHaveLength(2);
  });

  it("groups but keeps unread if at least one notif is unread", () => {
    const a = makeNotif({
      id: "1",
      type: "system" as const,
      href: "/feed/post-1",
      read_at: "2026-05-09T13:00:00Z",
      actor: { id: "u-a", full_name: "A", username: "a", avatar_url: null },
    });
    const b = makeNotif({
      id: "2",
      type: "system" as const,
      href: "/feed/post-1",
      read_at: null,
      actor: { id: "u-b", full_name: "B", username: "b", avatar_url: null },
    });
    const result = groupNotifications([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0]!.read_at).toBeNull();
  });

  it("dedupes same actor across multiple notifications in a group", () => {
    const a = makeNotif({
      id: "1",
      type: "system" as const,
      href: "/feed/post-1",
      actor: { id: "u-alice", full_name: "Alice", username: "a", avatar_url: null },
    });
    const b = makeNotif({
      id: "2",
      type: "system" as const,
      href: "/feed/post-1",
      actor: { id: "u-alice", full_name: "Alice", username: "a", avatar_url: null },
    });
    const result = groupNotifications([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0]!.actors).toHaveLength(1);
    expect(result[0]!.count).toBe(2);
  });
});
