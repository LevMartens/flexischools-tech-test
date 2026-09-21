import type { OnboardingData } from './types'
import {
  isValidAbn,
  toLocalDateString,
  validateBusinessStep,
  validateOnboarding,
  validateServiceStep,
} from './validation'

/**
 * Fixed clock for every test, so nothing here depends on the real date.
 * Midday avoids any chance of a DST shift moving the local calendar day.
 */
const TODAY = new Date(2026, 8, 22, 12, 0, 0) // 22 September 2026, local time
const TODAY_STRING = '2026-09-22'
const YESTERDAY_STRING = '2026-09-21'
const TOMORROW_STRING = '2026-09-23'

/** A real, checksum-valid ABN published by the ATO as its worked example. */
const VALID_ABN = '51824753556'

const validBusiness = {
  businessName: 'Sunnyvale Primary School',
  abn: VALID_ABN,
  contactName: 'Jo Smith',
  email: 'jo.smith@sunnyvale.edu.au',
  phone: '0412 345 678',
}

const validService = {
  serviceType: 'canteen',
  locationName: 'Main Campus Canteen',
  startDate: TOMORROW_STRING,
} satisfies Partial<OnboardingData>

describe('validateBusinessStep', () => {
  it('returns no errors for a fully valid step', () => {
    expect(validateBusinessStep(validBusiness)).toEqual({})
  })

  describe('missing fields', () => {
    it('reports every field when nothing has been entered', () => {
      const errors = validateBusinessStep({})

      expect(Object.keys(errors).sort()).toEqual([
        'abn',
        'businessName',
        'contactName',
        'email',
        'phone',
      ])
    })

    it.each([
      'businessName',
      'abn',
      'contactName',
      'email',
      'phone',
    ] as const)('reports %s when it is an empty string', (field) => {
      const errors = validateBusinessStep({ ...validBusiness, [field]: '' })

      expect(errors[field]).toBeTruthy()
      expect(Object.keys(errors)).toEqual([field])
    })

    it.each([
      'businessName',
      'abn',
      'contactName',
      'email',
      'phone',
    ] as const)('treats whitespace-only %s as missing', (field) => {
      const errors = validateBusinessStep({ ...validBusiness, [field]: '   ' })

      expect(errors[field]).toBeTruthy()
    })
  })

  describe('email format', () => {
    it.each([
      ['no at sign', 'jo.smith.sunnyvale.edu.au'],
      ['no domain', 'jo@'],
      ['no local part', '@sunnyvale.edu.au'],
      ['no top-level domain', 'jo@sunnyvale'],
      ['trailing dot', 'jo@sunnyvale.'],
      ['a space inside', 'jo smith@sunnyvale.edu.au'],
      ['two at signs', 'jo@@sunnyvale.edu.au'],
    ])('rejects an address with %s', (_case, email) => {
      expect(validateBusinessStep({ ...validBusiness, email }).email).toBe(
        'Enter a valid email address',
      )
    })

    it.each([
      'jo@sunnyvale.edu.au',
      'jo.smith+canteen@sunnyvale.com',
      'jo_smith@sub.domain.co',
      'JO@SUNNYVALE.EDU.AU',
    ])('accepts %s', (email) => {
      expect(validateBusinessStep({ ...validBusiness, email }).email).toBeUndefined()
    })
  })

  describe('ABN', () => {
    it('accepts the valid ABN 51 824 753 556', () => {
      expect(isValidAbn(VALID_ABN)).toBe(true)
      expect(validateBusinessStep({ ...validBusiness, abn: VALID_ABN }).abn)
        .toBeUndefined()
    })

    it('accepts the same ABN written with spaces', () => {
      expect(isValidAbn('51 824 753 556')).toBe(true)
      expect(
        validateBusinessStep({ ...validBusiness, abn: '51 824 753 556' }).abn,
      ).toBeUndefined()
    })

    it.each(['53004085616', '33051775556'])(
      'accepts other real ABNs (%s)',
      (abn) => {
        expect(isValidAbn(abn)).toBe(true)
      },
    )

    it('rejects an 11-digit number that fails the checksum', () => {
      expect(isValidAbn('12345678901')).toBe(false)
      expect(validateBusinessStep({ ...validBusiness, abn: '12345678901' }).abn)
        .toBe('ABN is not valid')
    })

    it('rejects a valid ABN with two digits transposed', () => {
      expect(isValidAbn('51824753565')).toBe(false)
      expect(validateBusinessStep({ ...validBusiness, abn: '51824753565' }).abn)
        .toBe('ABN is not valid')
    })

    it.each([
      ['too short', '5182475355'],
      ['too long', '518247535567'],
      ['letters', '5182475355a'],
      ['punctuation', '51-824-753-556'],
    ])('rejects an ABN that is %s', (_case, abn) => {
      expect(isValidAbn(abn)).toBe(false)
      expect(validateBusinessStep({ ...validBusiness, abn }).abn).toBe(
        'ABN must be 11 digits',
      )
    })
  })

  describe('Australian phone numbers', () => {
    it.each([
      ['mobile with spaces', '0412 345 678'],
      ['mobile without spaces', '0412345678'],
      ['Sydney landline', '02 9876 5432'],
      ['Melbourne landline', '0398765432'],
      ['Brisbane landline', '07 3123 4567'],
      ['Perth landline', '08 9123 4567'],
      ['1300 number', '1300 975 707'],
      ['1800 number', '1800123456'],
      ['13 number', '132221'],
    ])('accepts a %s', (_case, phone) => {
      expect(validateBusinessStep({ ...validBusiness, phone }).phone)
        .toBeUndefined()
    })

    it.each([
      ['hyphens', '0412-345-678'],
      ['a +61 prefix', '+61412345678'],
      ['brackets', '(02) 9876 5432'],
      ['letters', '0412 34J 678'],
      ['too few digits', '12345'],
      ['too many digits', '041234567890'],
      ['a leading digit that is not 0, 13 or 1800', '0512345678'],
    ])('rejects a number with %s', (_case, phone) => {
      expect(validateBusinessStep({ ...validBusiness, phone }).phone).toBe(
        'Enter a valid Australian phone number',
      )
    })
  })

  it('does not report service-step fields', () => {
    const errors = validateBusinessStep({})

    expect(errors.serviceType).toBeUndefined()
    expect(errors.locationName).toBeUndefined()
    expect(errors.startDate).toBeUndefined()
  })
})

describe('validateServiceStep', () => {
  it('returns no errors for a fully valid step', () => {
    expect(validateServiceStep(validService, TODAY)).toEqual({})
  })

  describe('missing fields', () => {
    it('reports every field when nothing has been entered', () => {
      const errors = validateServiceStep({}, TODAY)

      expect(Object.keys(errors).sort()).toEqual([
        'locationName',
        'serviceType',
        'startDate',
      ])
      expect(errors.serviceType).toBe('Select a service type')
      expect(errors.locationName).toBe('Location name is required')
      expect(errors.startDate).toBe('Start date is required')
    })

    it('treats a whitespace-only location name as missing', () => {
      expect(
        validateServiceStep({ ...validService, locationName: '  ' }, TODAY)
          .locationName,
      ).toBe('Location name is required')
    })
  })

  describe('service type', () => {
    it.each(['canteen', 'uniform-shop', 'events'] as const)(
      'accepts %s',
      (serviceType) => {
        expect(
          validateServiceStep({ ...validService, serviceType }, TODAY)
            .serviceType,
        ).toBeUndefined()
      },
    )

    it('rejects a value outside the allowed set', () => {
      const errors = validateServiceStep(
        // Cast: guards against a bad value arriving from outside TypeScript.
        { ...validService, serviceType: 'library' as never },
        TODAY,
      )

      expect(errors.serviceType).toBe('Select a valid service type')
    })
  })

  describe('start date', () => {
    it('rejects a date before today', () => {
      expect(
        validateServiceStep(
          { ...validService, startDate: YESTERDAY_STRING },
          TODAY,
        ).startDate,
      ).toBe('Start date cannot be in the past')
    })

    it('rejects a date well in the past', () => {
      expect(
        validateServiceStep({ ...validService, startDate: '2020-01-01' }, TODAY)
          .startDate,
      ).toBe('Start date cannot be in the past')
    })

    it("allows today's date", () => {
      expect(
        validateServiceStep({ ...validService, startDate: TODAY_STRING }, TODAY),
      ).toEqual({})
    })

    it('allows a date in the future', () => {
      expect(
        validateServiceStep(
          { ...validService, startDate: TOMORROW_STRING },
          TODAY,
        ),
      ).toEqual({})
      expect(
        validateServiceStep({ ...validService, startDate: '2030-12-31' }, TODAY)
          .startDate,
      ).toBeUndefined()
    })

    it('compares across month and year boundaries', () => {
      const newYearsEve = new Date(2026, 11, 31, 12, 0, 0)

      expect(
        validateServiceStep(
          { ...validService, startDate: '2027-01-01' },
          newYearsEve,
        ).startDate,
      ).toBeUndefined()
      expect(
        validateServiceStep(
          { ...validService, startDate: '2026-12-30' },
          newYearsEve,
        ).startDate,
      ).toBe('Start date cannot be in the past')
    })

    it.each([
      ['a day that does not exist', '2026-02-31'],
      ['a month that does not exist', '2026-13-01'],
      ['day/month/year order', '22/09/2026'],
      ['a two-digit year', '26-09-22'],
      ['a missing zero pad', '2026-9-22'],
      ['free text', 'next Monday'],
    ])('rejects %s as an invalid date', (_case, startDate) => {
      expect(
        validateServiceStep({ ...validService, startDate }, TODAY).startDate,
      ).toBe('Enter a valid date')
    })

    it('accepts 29 February in a leap year', () => {
      expect(
        validateServiceStep(
          { ...validService, startDate: '2028-02-29' },
          TODAY,
        ).startDate,
      ).toBeUndefined()
    })

    // A UTC-based "today" drifts a day away from the local one near midnight:
    // east of Greenwich it lands on the previous day in the early morning,
    // west of Greenwich on the next day late at night. Checking both instants
    // catches that bug whichever timezone the tests happen to run in.
    it.each([
      ['just after midnight', new Date(2026, 8, 22, 0, 30, 0)],
      ['late in the evening', new Date(2026, 8, 22, 23, 30, 0)],
    ])('uses the local calendar day, not UTC (%s)', (_case, now) => {
      expect(toLocalDateString(now)).toBe(TODAY_STRING)

      expect(
        validateServiceStep({ ...validService, startDate: TODAY_STRING }, now),
      ).toEqual({})
      expect(
        validateServiceStep(
          { ...validService, startDate: YESTERDAY_STRING },
          now,
        ).startDate,
      ).toBe('Start date cannot be in the past')
      expect(
        validateServiceStep(
          { ...validService, startDate: TOMORROW_STRING },
          now,
        ).startDate,
      ).toBeUndefined()
    })
  })

  it('does not report business-step fields', () => {
    const errors = validateServiceStep({}, TODAY)

    expect(errors.businessName).toBeUndefined()
    expect(errors.abn).toBeUndefined()
    expect(errors.email).toBeUndefined()
  })
})

describe('validateOnboarding', () => {
  it('returns no errors when both steps are valid', () => {
    expect(
      validateOnboarding({ ...validBusiness, ...validService }, TODAY),
    ).toEqual({})
  })

  it('merges errors from both steps', () => {
    const errors = validateOnboarding(
      { ...validBusiness, email: 'nope', startDate: YESTERDAY_STRING },
      TODAY,
    )

    expect(Object.keys(errors).sort()).toEqual([
      'email',
      'locationName',
      'serviceType',
      'startDate',
    ])
  })
})
