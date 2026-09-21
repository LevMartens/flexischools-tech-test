import { PRODUCTS } from '../data/products';
import type { OrderLine, Product } from '../types';

const LATENCY_MS = 600;

/**
 * Set these to `true` to force the matching call to reject, so error states can
 * be exercised without touching the network. Exported as an object because ES
 * module bindings are read-only from the outside.
 */
export const mockApiFailures = {
  fetchProducts: false,
  submitOrder: false,
};

export function resetMockApiFailures(): void {
  mockApiFailures.fetchProducts = false;
  mockApiFailures.submitOrder = false;
}

export type OrderConfirmation = {
  orderId: string;
  totalCents: number;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchProducts(): Promise<Product[]> {
  await delay(LATENCY_MS);

  if (mockApiFailures.fetchProducts) {
    throw new Error('Unable to load the menu. Please try again.');
  }

  return PRODUCTS;
}

export async function submitOrder(lines: OrderLine[]): Promise<OrderConfirmation> {
  await delay(LATENCY_MS);

  if (mockApiFailures.submitOrder) {
    throw new Error('Unable to place your order. Please try again.');
  }

  return {
    orderId: `ORD-${Date.now()}`,
    totalCents: lines.reduce((total, line) => total + line.product.priceCents * line.quantity, 0),
  };
}
