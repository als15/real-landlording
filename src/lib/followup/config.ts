/**
 * Follow-up system feature flag.
 * Set FOLLOW_UP_SYSTEM_ENABLED=true in env to activate.
 * Disabled by default — all cron processing and trigger creation are gated behind this.
 */
export function isFollowUpSystemEnabled(): boolean {
  return process.env.FOLLOW_UP_SYSTEM_ENABLED === 'true';
}
