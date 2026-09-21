import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OnboardingFlow from './OnboardingFlow'
import type { OnboardingData } from './types'
import { toLocalDateString } from './validation'

/**
 * The API is mocked at the module boundary. The fake keeps `submitOnboarding`'s
 * contract — a promise that resolves with a reference id or rejects with an
 * Error — but returns in 100ms instead of 800ms so the suite stays quick. The
 * delay is deliberately non-zero: the loading-state tests need a window in
 * which the request is still in flight.
 */
const api = vi.hoisted(() => {
  const SUBMIT_DELAY = 100
  let failing = false

  return {
    setFailing: (value: boolean) => {
      failing = value
    },
    submitOnboarding: vi.fn(async (): Promise<{ referenceId: string }> => {
      await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY))
      if (failing) throw new Error(SUBMIT_ERROR)
      return { referenceId: 'FS-TEST01' }
    }),
  }
})

/** Mirrors the message in `api/mockApi.ts`. */
const SUBMIT_ERROR = 'Something went wrong submitting your application.'

vi.mock('./api/mockApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/mockApi')>()),
  submitOnboarding: api.submitOnboarding,
}))

beforeEach(() => {
  api.submitOnboarding.mockClear()
  api.setFailing(false)
})

type User = ReturnType<typeof userEvent.setup>

const FUTURE_DATE = toLocalDateString(new Date(Date.now() + 7 * 864e5))

const BUSINESS = {
  businessName: 'Sunnyvale Primary',
  abn: '51 824 753 556',
  contactName: 'Jo Smith',
  email: 'jo@sunnyvale.edu.au',
  phone: '0412 345 678',
}

const next = (u: User) => u.click(screen.getByRole('button', { name: 'Next' }))

async function fillBusinessStep(u: User) {
  await u.type(screen.getByLabelText(/Business name/), BUSINESS.businessName)
  await u.type(screen.getByLabelText(/ABN/), BUSINESS.abn)
  await u.type(screen.getByLabelText(/Contact name/), BUSINESS.contactName)
  await u.type(screen.getByLabelText(/Email/), BUSINESS.email)
  await u.type(screen.getByLabelText(/Phone/), BUSINESS.phone)
}

async function fillServiceStep(u: User) {
  await u.selectOptions(screen.getByLabelText(/Service type/), 'canteen')
  await u.type(screen.getByLabelText(/Location name/), 'Main Campus')
  await u.type(screen.getByLabelText(/Start date/), FUTURE_DATE)
}

/** Leaves the user on the review step with every field filled in validly. */
async function goToReview(u: User) {
  await fillBusinessStep(u)
  await next(u)
  await fillServiceStep(u)
  await next(u)
}

const submitButton = () =>
  screen.getByRole('button', { name: 'Submit application' })

const awaitConfirmation = () =>
  screen.findByRole(
    'heading',
    { name: 'Application submitted' },
    { timeout: 3000 },
  )

describe('progress indicator', () => {
  it('names every step and marks only the active one', () => {
    render(<OnboardingFlow />)

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      '1.Business details',
      '2.Service details',
      '3.Review',
    ])
    expect(items[0]).toHaveAttribute('aria-current', 'step')
    expect(items[1]).not.toHaveAttribute('aria-current')
    expect(items[2]).not.toHaveAttribute('aria-current')
  })

  it('moves aria-current as the user advances', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await fillBusinessStep(u)
    await next(u)

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).not.toHaveAttribute('aria-current')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
  })
})

describe('when errors become visible', () => {
  it('stays quiet while a field is being typed into for the first time', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    const email = screen.getByLabelText(/Email/)

    await u.type(email, 'not-an-email')

    expect(email).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText('Enter a valid email address')).toBeNull()
  })

  it('shows the error once the field is blurred', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    const email = screen.getByLabelText(/Email/)

    await u.type(email, 'not-an-email')
    await u.tab()

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Enter a valid email address')
  })

  it('clears a touched field’s error live as it is corrected', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    const email = screen.getByLabelText(/Email/)

    await u.type(email, 'nope')
    await u.tab()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()

    await u.clear(email)
    await u.type(email, BUSINESS.email)

    expect(screen.queryByText('Enter a valid email address')).toBeNull()
  })

  it('reveals every error on the step when Next is pressed', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await next(u)

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('Business name is required')).toBeInTheDocument()
    expect(screen.getByText('ABN is required')).toBeInTheDocument()
    expect(screen.getByText('Contact name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Phone number is required')).toBeInTheDocument()
  })
})

describe('focus management on a failed Next', () => {
  it('focuses the first invalid field', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await next(u)

    expect(screen.getByLabelText(/Business name/)).toHaveFocus()
  })

  it('skips fields that are already valid', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await u.type(screen.getByLabelText(/Business name/), BUSINESS.businessName)
    await u.type(screen.getByLabelText(/ABN/), '51824753556')
    await next(u)

    expect(screen.getByLabelText(/Contact name/)).toHaveFocus()
  })

  it('reports an invalid email and stays on step 1', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    // Everything valid except the email.
    await fillBusinessStep(u)
    await u.clear(screen.getByLabelText(/Email/))
    await u.type(screen.getByLabelText(/Email/), 'not-an-email')
    await next(u)

    const email = screen.getByLabelText(/Email/)
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveFocus()

    // Still on step 1: the service step never rendered.
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Service details' }),
    ).toBeNull()
  })

  it('reports a failed ABN checksum and stays on the step', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await u.type(screen.getByLabelText(/Business name/), 'X')
    await u.type(screen.getByLabelText(/ABN/), '12345678901')
    await u.type(screen.getByLabelText(/Contact name/), 'Jo')
    await u.type(screen.getByLabelText(/Email/), 'jo@x.edu.au')
    await u.type(screen.getByLabelText(/Phone/), '0412345678')
    await next(u)

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('ABN is not valid')).toBeInTheDocument()
    expect(screen.getByLabelText(/ABN/)).toHaveFocus()
  })

  it('focuses the invalid select on the service step', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await fillBusinessStep(u)
    await next(u)
    await next(u)

    expect(screen.getByText('Select a service type')).toBeInTheDocument()
    expect(screen.getByLabelText(/Service type/)).toHaveFocus()
  })

  it('rejects a start date before today', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await fillBusinessStep(u)
    await next(u)
    await u.selectOptions(screen.getByLabelText(/Service type/), 'canteen')
    await u.type(screen.getByLabelText(/Location name/), 'Main Campus')
    const date = screen.getByLabelText(/Start date/)
    await u.type(date, '2020-01-01')
    await next(u)

    expect(
      screen.getByText('Start date cannot be in the past'),
    ).toBeInTheDocument()
    expect(date).toHaveFocus()

    // Blocked: still on step 2, and the review groups never rendered.
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Business details' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Submit application' }),
    ).toBeNull()
  })
})

describe('navigating between steps', () => {
  it('focuses the heading of the step it moves to', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await fillBusinessStep(u)
    await next(u)

    expect(
      screen.getByRole('heading', { name: 'Service details' }),
    ).toHaveFocus()
  })

  it('offers Back on steps 2 and 3 but not step 1', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()

    await fillBusinessStep(u)
    await next(u)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()

    await fillServiceStep(u)
    await next(u)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('keeps step 1 data when going Back from step 2', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await fillBusinessStep(u)
    await next(u)
    await u.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByLabelText(/Business name/)).toHaveValue(
      BUSINESS.businessName,
    )
    expect(screen.getByLabelText(/ABN/)).toHaveValue(BUSINESS.abn)
    expect(screen.getByLabelText(/Email/)).toHaveValue(BUSINESS.email)
    expect(screen.getByLabelText(/Phone/)).toHaveValue(BUSINESS.phone)
  })

  it('keeps step 2 data when going Back from review', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)

    await goToReview(u)
    await u.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByLabelText(/Service type/)).toHaveValue('canteen')
    expect(screen.getByLabelText(/Location name/)).toHaveValue('Main Campus')
    expect(screen.getByLabelText(/Start date/)).toHaveValue(FUTURE_DATE)
  })
})

describe('review step', () => {
  it('groups the entered data by step', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await goToReview(u)

    const business = screen.getByRole('region', { name: 'Business details' })
    expect(
      within(business).getAllByRole('term').map((t) => t.textContent),
    ).toEqual(['Business name', 'ABN', 'Contact name', 'Email', 'Phone'])
    expect(
      within(business).getAllByRole('definition').map((d) => d.textContent),
    ).toEqual([
      BUSINESS.businessName,
      BUSINESS.abn,
      BUSINESS.contactName,
      BUSINESS.email,
      BUSINESS.phone,
    ])

    const service = screen.getByRole('region', { name: 'Service details' })
    expect(
      within(service).getAllByRole('term').map((t) => t.textContent),
    ).toEqual(['Service type', 'Location name', 'Start date'])
    // The label, not the stored 'canteen' value.
    expect(
      within(service).getAllByRole('definition').map((d) => d.textContent),
    ).toEqual(['Canteen', 'Main Campus', FUTURE_DATE])
  })

  it('gives the two Edit buttons distinct accessible names', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await goToReview(u)

    expect(
      screen.getByRole('button', { name: 'Edit business details' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit service details' }),
    ).toBeInTheDocument()
  })

  it('jumps to the business step, keeping the data, and walks forward normally', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await goToReview(u)

    await u.click(screen.getByRole('button', { name: 'Edit business details' }))

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Business details' }),
    ).toHaveFocus()
    expect(screen.getByLabelText(/Business name/)).toHaveValue(
      BUSINESS.businessName,
    )

    await u.clear(screen.getByLabelText(/Business name/))
    await u.type(screen.getByLabelText(/Business name/), 'Renamed School')

    // Next returns through the steps in the usual order, not straight back.
    await next(u)
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    expect(screen.getByLabelText(/Location name/)).toHaveValue('Main Campus')

    await next(u)
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
    const business = screen.getByRole('region', { name: 'Business details' })
    expect(within(business).getByText('Renamed School')).toBeInTheDocument()
  })

  it('jumps to the service step', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await goToReview(u)

    await u.click(screen.getByRole('button', { name: 'Edit service details' }))

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Service details' }),
    ).toHaveFocus()
    expect(screen.getByLabelText(/Service type/)).toHaveValue('canteen')
  })
})

describe('submitting', () => {
  it('sends the entered data to the API', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await goToReview(u)

    await u.click(submitButton())
    await awaitConfirmation()

    expect(api.submitOnboarding).toHaveBeenCalledTimes(1)
    expect(api.submitOnboarding).toHaveBeenCalledWith({
      ...BUSINESS,
      serviceType: 'canteen',
      locationName: 'Main Campus',
      startDate: FUTURE_DATE,
    } satisfies OnboardingData)
  })

  it('disables the submit and Edit buttons while in flight', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await goToReview(u)

    await u.click(submitButton())

    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Edit business details' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()

    await awaitConfirmation()
  })

  it('submits once even when the button is clicked repeatedly', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await goToReview(u)

    // Fired synchronously: React has not re-rendered the disabled button yet,
    // so only the flow's own guard can prevent the extra calls.
    const button = submitButton()
    button.click()
    button.click()
    button.click()

    await awaitConfirmation()
    expect(api.submitOnboarding).toHaveBeenCalledTimes(1)
  })

  it('confirms success and focuses the confirmation heading', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await goToReview(u)

    await u.click(submitButton())

    const heading = await awaitConfirmation()
    expect(heading).toHaveFocus()
    expect(screen.getByText('FS-TEST01')).toBeInTheDocument()
    expect(
      screen.getByText(/We’ve received the application for Sunnyvale Primary/),
    ).toBeInTheDocument()
  })
})

describe('when submitting fails', () => {
  it('shows an alert, offers Retry, and keeps the data', async () => {
    const u = userEvent.setup()
    api.setFailing(true)
    render(<OnboardingFlow />)
    await goToReview(u)

    await u.click(submitButton())

    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert).toHaveTextContent(SUBMIT_ERROR)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()

    const business = screen.getByRole('region', { name: 'Business details' })
    expect(
      within(business).getByText(BUSINESS.businessName),
    ).toBeInTheDocument()
    const service = screen.getByRole('region', { name: 'Service details' })
    expect(within(service).getByText('Canteen')).toBeInTheDocument()

    // Held on review rather than pushed to a confirmation screen.
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
    expect(screen.queryByText('Application submitted')).toBeNull()
  })

  it('succeeds on retry', async () => {
    const u = userEvent.setup()
    api.setFailing(true)
    render(<OnboardingFlow />)
    await goToReview(u)
    await u.click(submitButton())
    await screen.findByRole('alert', {}, { timeout: 3000 })

    api.setFailing(false)
    await u.click(screen.getByRole('button', { name: 'Retry' }))

    await awaitConfirmation()
    expect(api.submitOnboarding).toHaveBeenCalledTimes(2)
  })

  it('clears the error when the user goes off to edit', async () => {
    const u = userEvent.setup()
    api.setFailing(true)
    render(<OnboardingFlow />)
    await goToReview(u)
    await u.click(submitButton())
    await screen.findByRole('alert', {}, { timeout: 3000 })

    await u.click(screen.getByRole('button', { name: 'Edit business details' }))

    expect(screen.queryByRole('alert')).toBeNull()

    await next(u)
    await next(u)
    expect(submitButton()).toBeInTheDocument()
  })
})

describe('starting a new application', () => {
  const submitOnce = async (u: User) => {
    await goToReview(u)
    await u.click(submitButton())
    return awaitConfirmation()
  }

  const startNew = (u: User) =>
    u.click(screen.getByRole('button', { name: 'Start a new application' }))

  it('resets the step and focuses the first heading', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await submitOnce(u)

    await startNew(u)

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(
      screen.getByRole('heading', { name: 'Business details' }),
    ).toHaveFocus()
    expect(screen.queryByText('Application submitted')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('clears the values and the touched state', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await submitOnce(u)

    await startNew(u)

    expect(screen.getByLabelText(/Business name/)).toHaveValue('')
    expect(screen.getByLabelText(/Email/)).toHaveValue('')
    // Touched state went too, so a fresh form shows no errors.
    expect(screen.queryByText('Business name is required')).toBeNull()
    expect(screen.getByLabelText(/Business name/)).not.toHaveAttribute(
      'aria-invalid',
    )
  })

  it('clears the service step as well, not just the first', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await submitOnce(u)
    await startNew(u)

    await fillBusinessStep(u)
    await next(u)

    expect(screen.getByLabelText(/Service type/)).toHaveValue('')
    expect(screen.getByLabelText(/Location name/)).toHaveValue('')
    expect(screen.getByLabelText(/Start date/)).toHaveValue('')
    expect(screen.queryByText('Select a service type')).toBeNull()
  })

  it('can complete a second application end to end', async () => {
    const u = userEvent.setup()
    render(<OnboardingFlow />)
    await submitOnce(u)
    await startNew(u)

    const heading = await submitOnce(u)

    expect(heading).toHaveFocus()
    expect(api.submitOnboarding).toHaveBeenCalledTimes(2)
  })
})
