/**
 * Dev-only diagnostic logging for the announcement/tour flow.
 *
 * This exists purely to make the "why did/didn't this show" decision
 * visible in the browser console without digging through DevTools'
 * Application tab by hand. It's a no-op in production builds (tree-shaken
 * via NODE_ENV) and adds no behavior of its own — it only reports on
 * decisions the store/components were already making.
 */
export function onboardingLog(event: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return
   
  console.debug(`[onboarding] ${event}`, data ?? '')
}
