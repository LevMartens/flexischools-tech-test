import type { OnboardingData } from '../types'

export interface SubmitOnboardingResult {
  referenceId: string
}

/** How long a submission takes to come back, in milliseconds. */
export const SUBMIT_DELAY_MS = 800

/**
 * When true, `submitOnboarding` rejects instead of resolving. Exported so the
 * UI can offer a "simulate failure" toggle and so tests can exercise the retry
 * path. ES module bindings are read-only for importers, so flip it with
 * `setShouldFailSubmission` rather than assigning to it.
 */
export let shouldFailSubmission = false

export function setShouldFailSubmission(value: boolean): void {
  shouldFailSubmission = value
}

/** The payload handed to the most recent call, or null if there wasn't one. */
export let lastSubmission: OnboardingData | null = null

/** Returns the module to its initial state between tests. */
export function resetMockApi(): void {
  shouldFailSubmission = false
  lastSubmission = null
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const createReferenceId = (): string =>
  `FS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

/**
 * Stands in for the real onboarding endpoint: waits {@link SUBMIT_DELAY_MS}
 * and then resolves with a reference id, or rejects while
 * {@link shouldFailSubmission} is set.
 */
export async function submitOnboarding(
  data: OnboardingData,
): Promise<SubmitOnboardingResult> {
  lastSubmission = data

  await delay(SUBMIT_DELAY_MS)

  if (shouldFailSubmission) {
    throw new Error('Something went wrong submitting your application.')
  }

  return { referenceId: createReferenceId() }
}
