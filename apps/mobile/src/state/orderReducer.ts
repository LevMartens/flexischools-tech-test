import type { OrderLine, Product } from '../types';

export type OrderState = OrderLine[];

export type OrderAction =
  | { type: 'add'; product: Product }
  | { type: 'increment'; productId: string }
  | { type: 'decrement'; productId: string }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

export const initialOrderState: OrderState = [];

/**
 * Applies `change` to the matching line's quantity, dropping any line that ends
 * at zero. Quantities are clamped at zero, so a line can never go negative.
 */
function adjustQuantity(state: OrderState, productId: string, change: number): OrderState {
  const line = state.find((candidate) => candidate.product.id === productId);

  if (!line) {
    return state;
  }

  const quantity = Math.max(0, line.quantity + change);

  if (quantity === 0) {
    return state.filter((candidate) => candidate.product.id !== productId);
  }

  return state.map((candidate) =>
    candidate.product.id === productId ? { ...candidate, quantity } : candidate
  );
}

export function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'add': {
      if (!action.product.isAvailable) {
        return state;
      }

      const existing = state.find((line) => line.product.id === action.product.id);

      if (existing) {
        return adjustQuantity(state, action.product.id, 1);
      }

      return [...state, { product: action.product, quantity: 1 }];
    }

    case 'increment':
      return adjustQuantity(state, action.productId, 1);

    case 'decrement':
      return adjustQuantity(state, action.productId, -1);

    case 'remove':
      return state.filter((line) => line.product.id !== action.productId);

    case 'clear':
      return state.length === 0 ? state : initialOrderState;

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function getOrderTotalCents(state: OrderState): number {
  return state.reduce((total, line) => total + line.product.priceCents * line.quantity, 0);
}

export function getItemCount(state: OrderState): number {
  return state.reduce((count, line) => count + line.quantity, 0);
}
