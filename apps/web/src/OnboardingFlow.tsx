import { useEffect, useMemo, useReducer, useRef } from 'react'
import { SelectField, TextField } from './components/FormField'
import { submitOnboarding } from './api/mockApi'
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  type OnboardingData,
  type ServiceType,
} from './types'
import {
  toLocalDateString,
  validateBusinessStep,
  validateOnboarding,
  validateServiceStep,
  type ValidationErrors,
} from './validation'

type FieldName = keyof OnboardingData

/**
 * The form's own shape. It differs from {@link OnboardingData} in one place:
 * before the user picks anything, `serviceType` is an empty string, which the
 * `ServiceType` union cannot represent. {@link toValidationInput} narrows it
 * back before validation runs.
 */
type FormValues = Omit<OnboardingData, 'serviceType'> & {
  serviceType: ServiceType | ''
}

const EMPTY_FORM: FormValues = {
  businessName: '',
  abn: '',
  contactName: '',
  email: '',
  phone: '',
  serviceType: '',
  locationName: '',
  startDate: '',
}

interface StepConfig {
  id: 'business' | 'service' | 'review'
  name: string
  /** In visual order, so "first invalid field" means the topmost one. */
  fields: FieldName[]
}

const STEPS: StepConfig[] = [
  {
    id: 'business',
    name: 'Business details',
    fields: ['businessName', 'abn', 'contactName', 'email', 'phone'],
  },
  {
    id: 'service',
    name: 'Service details',
    fields: ['serviceType', 'locationName', 'startDate'],
  },
  { id: 'review', name: 'Review', fields: [] },
]

const LAST_STEP = STEPS.length - 1

/** Where focus should go, and a nonce so repeating the same request re-fires. */
interface FocusRequest {
  target: FieldName | 'heading'
  nonce: number
}

interface State {
  stepIndex: number
  values: FormValues
  /** A field's error is only shown once it is touched (blurred, or Next pressed). */
  touched: Partial<Record<FieldName, boolean>>
  focus: FocusRequest | null
  status: 'idle' | 'submitting' | 'succeeded' | 'failed'
  submitError: string | null
  referenceId: string | null
}

const INITIAL_STATE: State = {
  stepIndex: 0,
  values: EMPTY_FORM,
  touched: {},
  focus: null,
  status: 'idle',
  submitError: null,
  referenceId: null,
}

type Action =
  | { type: 'change'; field: FieldName; value: string }
  | { type: 'blur'; field: FieldName }
  | { type: 'advance'; errors: ValidationErrors }
  | { type: 'back' }
  | { type: 'submitStart' }
  | { type: 'submitSucceeded'; referenceId: string }
  | { type: 'submitFailed'; message: string }
  | { type: 'reset' }

const nextFocus = (state: State, target: FieldName | 'heading'): FocusRequest => ({
  target,
  nonce: (state.focus?.nonce ?? 0) + 1,
})

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'change':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
      }

    case 'blur':
      return { ...state, touched: { ...state.touched, [action.field]: true } }

    case 'advance': {
      const step = STEPS[state.stepIndex]
      const firstInvalid = step.fields.find((field) => action.errors[field])

      if (firstInvalid) {
        // Reveal every error on the step, not just the one being focused.
        const touched = { ...state.touched }
        for (const field of step.fields) touched[field] = true
        return { ...state, touched, focus: nextFocus(state, firstInvalid) }
      }

      return {
        ...state,
        stepIndex: Math.min(state.stepIndex + 1, LAST_STEP),
        focus: nextFocus(state, 'heading'),
      }
    }

    case 'back':
      // Values are untouched here, which is what makes Back non-destructive.
      return {
        ...state,
        stepIndex: Math.max(state.stepIndex - 1, 0),
        submitError: null,
        status: state.status === 'failed' ? 'idle' : state.status,
        focus: nextFocus(state, 'heading'),
      }

    case 'submitStart':
      return { ...state, status: 'submitting', submitError: null }

    case 'submitSucceeded':
      return {
        ...state,
        status: 'succeeded',
        referenceId: action.referenceId,
        submitError: null,
        focus: nextFocus(state, 'heading'),
      }

    case 'submitFailed':
      return { ...state, status: 'failed', submitError: action.message }

    case 'reset':
      // Everything goes: values, touched, step and submission status.
      return { ...INITIAL_STATE, focus: nextFocus(state, 'heading') }

    default:
      return state
  }
}

/** Drops the empty-string placeholder so `serviceType` fits the union again. */
const toValidationInput = (values: FormValues): Partial<OnboardingData> => ({
  ...values,
  serviceType: values.serviceType === '' ? undefined : values.serviceType,
})

const SERVICE_OPTIONS = SERVICE_TYPES.map((value) => ({
  value,
  label: SERVICE_TYPE_LABELS[value],
}))

export default function OnboardingFlow() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const { stepIndex, values, touched, status } = state

  const headingRef = useRef<HTMLHeadingElement>(null)
  const fieldRefs = useRef<
    Partial<Record<FieldName, HTMLInputElement | HTMLSelectElement | null>>
  >({})

  const today = useMemo(() => new Date(), [])
  const minStartDate = toLocalDateString(today)

  const errors = useMemo<ValidationErrors>(() => {
    const input = toValidationInput(values)
    if (stepIndex === 0) return validateBusinessStep(input)
    if (stepIndex === 1) return validateServiceStep(input, today)
    // The review step re-checks everything, so a stale value cannot slip past.
    return validateOnboarding(input, today)
  }, [stepIndex, values, today])

  // Focus runs as an effect so the error text exists in the DOM by the time
  // the field is focused, and so `aria-describedby` has something to point at.
  useEffect(() => {
    const focus = state.focus
    if (!focus) return

    if (focus.target === 'heading') {
      headingRef.current?.focus()
    } else {
      fieldRefs.current[focus.target]?.focus()
    }
  }, [state.focus])

  const setFieldRef =
    (field: FieldName) =>
    (element: HTMLInputElement | HTMLSelectElement | null) => {
      fieldRefs.current[field] = element
    }

  const fieldProps = (field: FieldName) => ({
    name: field,
    value: values[field],
    // A touched field updates live, so the error clears as it gets fixed.
    error: touched[field] ? errors[field] : undefined,
    ref: setFieldRef(field),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => dispatch({ type: 'change', field, value: event.target.value }),
    onBlur: () => dispatch({ type: 'blur', field }),
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'submitting') return

    if (stepIndex < LAST_STEP) {
      dispatch({ type: 'advance', errors })
      return
    }

    if (Object.keys(errors).length > 0) {
      // Shouldn't happen from the UI, but sends the user back rather than
      // posting a payload we know to be invalid.
      dispatch({ type: 'advance', errors })
      return
    }

    dispatch({ type: 'submitStart' })
    try {
      const result = await submitOnboarding(values as OnboardingData)
      dispatch({ type: 'submitSucceeded', referenceId: result.referenceId })
    } catch (error) {
      dispatch({
        type: 'submitFailed',
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong submitting your application.',
      })
    }
  }

  if (status === 'succeeded') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-green-600 bg-green-50 p-6">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold text-green-900 outline-none"
          >
            Application submitted
          </h2>
          <p className="mt-2 text-green-900">
            Thanks, {values.contactName}. We&rsquo;ve received the application
            for {values.businessName}.
          </p>
          <p className="mt-2 text-green-900">
            Your reference is{' '}
            <span className="font-mono font-bold">{state.referenceId}</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'reset' })}
          className="mt-6 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
        >
          Start a new application
        </button>
      </div>
    )
  }

  const step = STEPS[stepIndex]

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <nav aria-label="Progress" className="mb-6">
        <p className="text-sm font-medium text-gray-600">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <ol className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-4">
          {STEPS.map((item, index) => {
            const isCurrent = index === stepIndex
            const isComplete = index < stepIndex

            return (
              <li
                key={item.id}
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'flex items-center gap-2 border-l-4 py-1 pl-3 text-sm sm:flex-1 sm:border-l-0 sm:border-t-4 sm:pl-0 sm:pt-2',
                  isCurrent
                    ? 'border-blue-600 font-semibold text-blue-700'
                    : isComplete
                      ? 'border-blue-300 text-gray-700'
                      : 'border-gray-200 text-gray-500',
                ].join(' ')}
              >
                <span aria-hidden="true">{index + 1}.</span>
                {item.name}
                {isComplete && <span className="sr-only">(completed)</span>}
              </li>
            )
          })}
        </ol>
      </nav>

      <form onSubmit={handleSubmit} noValidate>
        {/*
          tabIndex -1 lets each step announce itself: focus lands here on
          every step change, so a screen reader reads the new step name
          instead of leaving the user on a button that has moved.
        */}
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mb-4 text-xl font-bold text-gray-900 outline-none"
        >
          {step.name}
        </h2>

        {step.id === 'business' && (
          <>
            <TextField
              label="Business name"
              required
              autoComplete="organization"
              {...fieldProps('businessName')}
            />
            <TextField
              label="ABN"
              required
              inputMode="numeric"
              hint="11 digits, spaces are fine."
              {...fieldProps('abn')}
            />
            <TextField
              label="Contact name"
              required
              autoComplete="name"
              {...fieldProps('contactName')}
            />
            <TextField
              label="Email"
              type="email"
              required
              autoComplete="email"
              {...fieldProps('email')}
            />
            <TextField
              label="Phone"
              type="tel"
              required
              autoComplete="tel"
              hint="Australian number, digits and spaces only."
              {...fieldProps('phone')}
            />
          </>
        )}

        {step.id === 'service' && (
          <>
            <SelectField
              label="Service type"
              required
              options={SERVICE_OPTIONS}
              {...fieldProps('serviceType')}
            />
            <TextField
              label="Location name"
              required
              {...fieldProps('locationName')}
            />
            <TextField
              label="Start date"
              type="date"
              required
              min={minStartDate}
              hint="Today or later."
              {...fieldProps('startDate')}
            />
          </>
        )}

        {step.id === 'review' && (
          <>
            <p className="mb-4 text-gray-700">
              Check the details below, then submit.
            </p>
            <dl className="mb-6 divide-y divide-gray-200 border-y border-gray-200">
              <ReviewRow label="Business name" value={values.businessName} />
              <ReviewRow label="ABN" value={values.abn} />
              <ReviewRow label="Contact name" value={values.contactName} />
              <ReviewRow label="Email" value={values.email} />
              <ReviewRow label="Phone" value={values.phone} />
              <ReviewRow
                label="Service type"
                value={
                  values.serviceType === ''
                    ? ''
                    : SERVICE_TYPE_LABELS[values.serviceType]
                }
              />
              <ReviewRow label="Location name" value={values.locationName} />
              <ReviewRow label="Start date" value={values.startDate} />
            </dl>
          </>
        )}

        {state.submitError && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-red-600 bg-red-50 p-3 text-sm text-red-700"
          >
            {state.submitError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'back' })}
              disabled={status === 'submitting'}
              className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {stepIndex === LAST_STEP
              ? status === 'submitting'
                ? 'Submitting…'
                : 'Submit application'
              : 'Next'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
      <dt className="text-sm font-medium text-gray-600 sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}
