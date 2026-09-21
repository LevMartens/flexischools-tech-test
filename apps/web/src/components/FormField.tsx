import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'

/**
 * Props every field shares. The `id`, `aria-invalid` and `aria-describedby`
 * attributes are owned by these components, so callers cannot set them.
 */
interface SharedFieldProps {
  /** Visible label text. Always rendered; never a placeholder-only field. */
  label: string
  /** Marks the field required and shows the asterisk. */
  required?: boolean
  /** Message to show below the control. Its presence is what marks the field invalid. */
  error?: string
  /** Optional help text, announced before the error. */
  hint?: string
}

type TextFieldProps = SharedFieldProps &
  Omit<
    ComponentPropsWithRef<'input'>,
    'id' | 'aria-invalid' | 'aria-describedby' | 'aria-required' | 'type'
  > & {
    type?: 'text' | 'email' | 'tel' | 'date'
  }

export interface SelectOption {
  value: string
  label: string
}

type SelectFieldProps = SharedFieldProps &
  Omit<
    ComponentPropsWithRef<'select'>,
    'id' | 'aria-invalid' | 'aria-describedby' | 'aria-required' | 'children'
  > & {
    options: SelectOption[]
    /** Text for the empty leading option. */
    placeholder?: string
  }

const controlClasses = [
  'w-full rounded-md border bg-white px-3 py-2 text-base text-gray-900',
  'placeholder:text-gray-400',
  'focus:outline-none focus:ring-2 focus:ring-offset-1',
  'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
].join(' ')

const validClasses = 'border-gray-300 focus:border-blue-600 focus:ring-blue-600'

const invalidClasses = 'border-red-600 focus:border-red-600 focus:ring-red-600'

const controlClassName = (invalid: boolean, extra?: string): string =>
  [controlClasses, invalid ? invalidClasses : validClasses, extra]
    .filter(Boolean)
    .join(' ')

/**
 * Builds the ids that tie a label, hint and error to one control.
 *
 * `aria-describedby` lists the hint before the error so a screen reader reads
 * the guidance first, and is left off entirely when there is neither.
 */
function useFieldIds(error?: string, hint?: string) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined

  return { id, errorId, hintId, describedBy, invalid: Boolean(error) }
}

interface FieldShellProps extends SharedFieldProps {
  id: string
  errorId: string
  hintId: string
  children: ReactNode
}

/** Label, control, hint and error in the order a screen reader should meet them. */
function FieldShell({
  id,
  errorId,
  hintId,
  label,
  required,
  error,
  hint,
  children,
}: FieldShellProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-gray-900"
      >
        {label}
        {required && (
          <>
            {/*
              The asterisk is decoration; the word is what gets announced.
              The `{' '}` is load-bearing: without a real text node here the
              accessible name computes as "Emailrequired" rather than
              "Email required", because a leading space inside the sr-only
              span is trimmed before the parts are joined.
            */}
            <span aria-hidden="true" className="ml-0.5 text-red-600">
              *
            </span>{' '}
            <span className="sr-only">required</span>
          </>
        )}
      </label>

      {children}

      {hint && (
        <p id={hintId} className="mt-1 text-sm text-gray-500">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({
  label,
  required,
  error,
  hint,
  className,
  type = 'text',
  ...rest
}: TextFieldProps) {
  const { id, errorId, hintId, describedBy, invalid } = useFieldIds(error, hint)

  return (
    <FieldShell
      id={id}
      errorId={errorId}
      hintId={hintId}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <input
        {...rest}
        id={id}
        type={type}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={controlClassName(invalid, className)}
      />
    </FieldShell>
  )
}

export function SelectField({
  label,
  required,
  error,
  hint,
  className,
  options,
  placeholder = 'Please select',
  ...rest
}: SelectFieldProps) {
  const { id, errorId, hintId, describedBy, invalid } = useFieldIds(error, hint)

  return (
    <FieldShell
      id={id}
      errorId={errorId}
      hintId={hintId}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <select
        {...rest}
        id={id}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={controlClassName(invalid, className)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
