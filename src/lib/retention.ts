import { TRIAL_DURATION_DAYS } from "@/lib/constants";

/**
 * When an event's files leave R2 for good.
 *
 * Photos and videos are the only part of the bill that grows on its own, and
 * nothing used to remove them: a One Event gallery kept every file long after
 * the 90 days it was sold for, and a photographer who tried the app and never
 * paid kept theirs for ever. These rules decide when those files go. The
 * nightly cron (`purgeExpiredEventMedia` in events.ts) applies them, and the
 * dashboards read the same dates to warn the owner first — so the warning and
 * the deletion can never disagree.
 *
 * Paying photographers are never in scope: they pay for their storage and their
 * quota already bounds it. Neither are admins.
 */

/** Days a closed One Event gallery keeps its files: the owner can still download. */
export const COUPLE_PURGE_GRACE_DAYS = 30;
/** Days after a never-paid photographer's trial ends before their files go. */
export const UNPAID_TRIAL_PURGE_DAYS = 60;
/** From this many days before deletion the dashboard warning turns urgent. */
export const PURGE_URGENT_DAYS = 7;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type RetentionOwner = {
  account_type?: string | null;
  role?: string | null;
  created_at: string;
  subscription_status?: string | null;
  subscription_external_id?: string | null;
};

export type RetentionSchedule = {
  /** When the dashboard starts saying the files will be deleted. */
  noticeFrom: Date;
  /** When the nightly cron may delete them. */
  purgeAt: Date;
};

function plusDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

/**
 * Never paid: no order or subscription was ever recorded, and nothing grants
 * access now. Someone who paid and later cancelled is not this — their files
 * are a separate decision, made by hand.
 */
export function isNeverPaid(owner: RetentionOwner) {
  if (owner.role === "admin") return false;
  if (owner.subscription_status === "active" || owner.subscription_status === "trialing") return false;
  return !owner.subscription_external_id;
}

/** A closed One Event gallery: kept for the grace period after access ends. */
export function coupleSchedule(accessEndsAt: string): RetentionSchedule {
  const accessEnd = new Date(accessEndsAt);
  return { noticeFrom: accessEnd, purgeAt: plusDays(accessEnd, COUPLE_PURGE_GRACE_DAYS) };
}

/**
 * A photographer who never paid. The trial ends after TRIAL_DURATION_DAYS at
 * the latest (sooner if the photo cap is hit), so counting from there is the
 * cautious end: nobody loses files earlier than the grace period promises.
 */
export function unpaidTrialSchedule(createdAt: string): RetentionSchedule {
  const trialEnd = plusDays(new Date(createdAt), TRIAL_DURATION_DAYS);
  return { noticeFrom: trialEnd, purgeAt: plusDays(trialEnd, UNPAID_TRIAL_PURGE_DAYS) };
}

/**
 * The schedule for one event, or null when its files are kept.
 * `coupleAccessEndsAt` is the event's gallery end (its expires_at, or the
 * One Event default) and only matters for couple accounts.
 */
export function retentionSchedule(owner: RetentionOwner, coupleAccessEndsAt: string | null): RetentionSchedule | null {
  if (owner.role === "admin") return null;

  if (owner.account_type === "couple") {
    return coupleAccessEndsAt ? coupleSchedule(coupleAccessEndsAt) : null;
  }

  return isNeverPaid(owner) ? unpaidTrialSchedule(owner.created_at) : null;
}

export function shouldPurge(schedule: RetentionSchedule | null, now: Date = new Date()) {
  return Boolean(schedule && schedule.purgeAt.getTime() <= now.getTime());
}

/** What the dashboard shows: nothing, a notice, or an urgent warning. */
export function retentionNotice(schedule: RetentionSchedule | null, now: Date = new Date()) {
  if (!schedule || now.getTime() < schedule.noticeFrom.getTime() || shouldPurge(schedule, now)) {
    return null;
  }

  const daysLeft = Math.max(0, Math.ceil((schedule.purgeAt.getTime() - now.getTime()) / DAY_IN_MS));
  return { purgeAt: schedule.purgeAt, daysLeft, urgent: daysLeft <= PURGE_URGENT_DAYS };
}
