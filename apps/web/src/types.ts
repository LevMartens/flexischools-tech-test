export type ServiceType = 'canteen' | 'uniform-shop' | 'events'

export interface OnboardingData {
  businessName: string
  abn: string
  contactName: string
  email: string
  phone: string
  serviceType: ServiceType
  locationName: string
  /** ISO calendar date, `YYYY-MM-DD`. */
  startDate: string
}

export const SERVICE_TYPES: ServiceType[] = [
  'canteen',
  'uniform-shop',
  'events',
]

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  canteen: 'Canteen',
  'uniform-shop': 'Uniform shop',
  events: 'Events',
}
