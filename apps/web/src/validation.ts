import { SERVICE_TYPES, type OnboardingData } from './types'

/**
 * Field name -> message. A field is only present when it has an error, so an
 * empty object means the step is valid.
 */
export type ValidationErrors = Partial<Record<keyof OnboardingData, string>>

/** The form is filled in step by step, so every field may still be blank. */
type PartialOnboardingData = Partial<OnboardingData>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Australian formats we accept, once spaces are removed:
 * landline `0[2378]` + 8 digits, mobile `04` + 8 digits, `1300`/`1800` + 6
 * digits, and the short `13` + 4 digits. International `+61` prefixes are
 * rejected because the brief limits input to digits and spaces.
 */
const AU_PHONE_PATTERNS = [
  /^0[2378]\d{8}$/,
  /^04\d{8}$/,
  /^1[38]00\d{6}$/,
  /^13\d{4}$/,
]

/** Positional weights from the ATO's ABN check-digit specification. */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

const stripSpaces = (value: string): string => value.replace(/ /g, '')

const isBlank = (value: string | undefined): boolean =>
  value === undefined || value.trim() === ''

/**
 * Official ABN checksum: subtract 1 from the leading digit, apply the
 * positional weights, and the total must be divisible by 89.
 */
export function isValidAbn(abn: string): boolean {
  const digits = stripSpaces(abn)
  if (!/^\d{11}$/.test(digits)) return false

  const total = ABN_WEIGHTS.reduce((sum, weight, index) => {
    const digit = Number(digits[index]) - (index === 0 ? 1 : 0)
    return sum + digit * weight
  }, 0)

  return total % 89 === 0
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function isValidAustralianPhone(phone: string): boolean {
  if (!/^[\d ]+$/.test(phone.trim())) return false
  const digits = stripSpaces(phone.trim())
  return AU_PHONE_PATTERNS.some((pattern) => pattern.test(digits))
}

/**
 * Today as `YYYY-MM-DD` in the user's local timezone. Built from the local
 * date parts rather than `toISOString()`, which would shift to UTC and put
 * users east of Greenwich on the wrong day.
 */
export function toLocalDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** True for a well-formed `YYYY-MM-DD` string that is a real calendar date. */
export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value.trim())
  if (!match) return false

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  // Rejects rollovers such as 2026-02-31, which Date would turn into March 3.
  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  )
}

/** Step 1: business identity and contact details. */
export function validateBusinessStep(
  data: PartialOnboardingData,
): ValidationErrors {
  const errors: ValidationErrors = {}

  if (isBlank(data.businessName)) {
    errors.businessName = 'Business name is required'
  }

  const abn = data.abn?.trim() ?? ''
  if (abn === '') {
    errors.abn = 'ABN is required'
  } else if (!/^\d{11}$/.test(stripSpaces(abn))) {
    errors.abn = 'ABN must be 11 digits'
  } else if (!isValidAbn(abn)) {
    errors.abn = 'ABN is not valid'
  }

  if (isBlank(data.contactName)) {
    errors.contactName = 'Contact name is required'
  }

  const email = data.email?.trim() ?? ''
  if (email === '') {
    errors.email = 'Email is required'
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address'
  }

  const phone = data.phone?.trim() ?? ''
  if (phone === '') {
    errors.phone = 'Phone number is required'
  } else if (!isValidAustralianPhone(phone)) {
    errors.phone = 'Enter a valid Australian phone number'
  }

  return errors
}

/**
 * Step 2: service selection, location and start date.
 *
 * `today` defaults to the current local date and can be passed in so tests
 * (and any caller needing a fixed clock) control what "before today" means.
 */
export function validateServiceStep(
  data: PartialOnboardingData,
  today: Date = new Date(),
): ValidationErrors {
  const errors: ValidationErrors = {}

  const serviceType = data.serviceType
  if (serviceType === undefined || serviceType.trim() === '') {
    errors.serviceType = 'Select a service type'
  } else if (!SERVICE_TYPES.includes(serviceType)) {
    errors.serviceType = 'Select a valid service type'
  }

  if (isBlank(data.locationName)) {
    errors.locationName = 'Location name is required'
  }

  const startDate = data.startDate?.trim() ?? ''
  if (startDate === '') {
    errors.startDate = 'Start date is required'
  } else if (!isValidDateString(startDate)) {
    errors.startDate = 'Enter a valid date'
  } else if (startDate < toLocalDateString(today)) {
    errors.startDate = 'Start date cannot be in the past'
  }

  return errors
}

/** Both steps at once, for a final check before submitting. */
export function validateOnboarding(
  data: PartialOnboardingData,
  today: Date = new Date(),
): ValidationErrors {
  return { ...validateBusinessStep(data), ...validateServiceStep(data, today) }
}
