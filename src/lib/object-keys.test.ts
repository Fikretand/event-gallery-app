import { describe, expect, it } from "vitest";

import { isEventObjectKey, isUserAvatarKey } from "./object-keys";

const EVENT = "11111111-2222-3333-4444-555555555555";
const OTHER = "99999999-8888-7777-6666-555555555555";
const USER = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("isEventObjectKey", () => {
  it("accepts every key shape the server creates for that event", () => {
    expect(isEventObjectKey(`events/${EVENT}/guest/2026-10/a.jpg`, EVENT)).toBe(true);
    expect(isEventObjectKey(`events/${EVENT}/photographer/2026-10/b.mov`, EVENT)).toBe(true);
    expect(isEventObjectKey(`events/${EVENT}/thumbs/m-1.jpg`, EVENT)).toBe(true);
    expect(isEventObjectKey(`events/${EVENT}/thumbs/vid-x.jpg`, EVENT)).toBe(true);
  });

  it("refuses another event's key", () => {
    expect(isEventObjectKey(`events/${OTHER}/guest/2026-10/a.jpg`, EVENT)).toBe(false);
  });

  it("refuses a prefix of a longer event id", () => {
    expect(isEventObjectKey(`events/${EVENT}0/guest/a.jpg`, EVENT)).toBe(false);
  });

  it("refuses avatars, traversal, absolute and empty keys", () => {
    expect(isEventObjectKey(`users/${USER}/avatar/x.png`, EVENT)).toBe(false);
    expect(isEventObjectKey(`events/${EVENT}/../${OTHER}/guest/a.jpg`, EVENT)).toBe(false);
    expect(isEventObjectKey(`/events/${EVENT}/guest/a.jpg`, EVENT)).toBe(false);
    expect(isEventObjectKey(`events/${EVENT}/`, EVENT)).toBe(false);
    expect(isEventObjectKey(null, EVENT)).toBe(false);
    expect(isEventObjectKey(`events/${EVENT}/a.jpg`, "")).toBe(false);
  });
});

describe("isUserAvatarKey", () => {
  it("accepts the caller's own avatar", () => {
    expect(isUserAvatarKey(`users/${USER}/avatar/6f1c.png`, USER)).toBe(true);
  });

  it("refuses a guest photo, another user's avatar and traversal", () => {
    expect(isUserAvatarKey(`events/${EVENT}/guest/2026-10/a.jpg`, USER)).toBe(false);
    expect(isUserAvatarKey(`users/${OTHER}/avatar/6f1c.png`, USER)).toBe(false);
    expect(isUserAvatarKey(`users/${USER}/avatar/../../events/${EVENT}/a.jpg`, USER)).toBe(false);
    expect(isUserAvatarKey(`users/${USER}/avatar/`, USER)).toBe(false);
    expect(isUserAvatarKey(undefined, USER)).toBe(false);
  });
});
