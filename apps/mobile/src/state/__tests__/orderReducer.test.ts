import {
  getItemCount,
  getOrderTotalCents,
  initialOrderState,
  orderReducer,
  type OrderState,
} from '../orderReducer';
import type { Product } from '../../types';

const pie: Product = {
  id: 'beef-pie',
  name: 'Beef Pie',
  category: 'Hot Food',
  priceCents: 450,
  isAvailable: true,
};

const milk: Product = {
  id: 'plain-milk',
  name: 'Plain Milk 300ml',
  category: 'Drinks',
  priceCents: 280,
  isAvailable: true,
};

const soldOut: Product = {
  id: 'hot-chips',
  name: 'Hot Chips',
  category: 'Hot Food',
  priceCents: 350,
  isAvailable: false,
};

function orderOf(...lines: [Product, number][]): OrderState {
  return lines.map(([product, quantity]) => ({ product, quantity }));
}

describe('orderReducer', () => {
  describe('add', () => {
    it('adds an available product as a new line with quantity 1', () => {
      const state = orderReducer(initialOrderState, { type: 'add', product: pie });

      expect(state).toEqual(orderOf([pie, 1]));
    });

    it('adding the same product twice gives one line with quantity 2', () => {
      let state = orderReducer(initialOrderState, { type: 'add', product: pie });
      state = orderReducer(state, { type: 'add', product: pie });

      expect(state).toHaveLength(1);
      expect(state[0].quantity).toBe(2);
    });

    it('refuses to add an unavailable product', () => {
      const state = orderReducer(initialOrderState, { type: 'add', product: soldOut });

      expect(state).toEqual([]);
    });

    it('refuses to add an unavailable product to a non-empty order', () => {
      const before = orderOf([pie, 1]);
      const after = orderReducer(before, { type: 'add', product: soldOut });

      expect(after).toBe(before);
    });
  });

  describe('increment', () => {
    it('raises the quantity of an existing line', () => {
      const state = orderReducer(orderOf([pie, 1]), { type: 'increment', productId: pie.id });

      expect(state).toEqual(orderOf([pie, 2]));
    });

    it('ignores a product that is not in the order', () => {
      const before = orderOf([pie, 1]);
      const after = orderReducer(before, { type: 'increment', productId: milk.id });

      expect(after).toBe(before);
    });
  });

  describe('decrement', () => {
    it('lowers the quantity of an existing line', () => {
      const state = orderReducer(orderOf([pie, 3]), { type: 'decrement', productId: pie.id });

      expect(state).toEqual(orderOf([pie, 2]));
    });

    it('removes the line when the quantity reaches 0', () => {
      const state = orderReducer(orderOf([pie, 1], [milk, 2]), {
        type: 'decrement',
        productId: pie.id,
      });

      expect(state).toEqual(orderOf([milk, 2]));
    });

    it('never lets a quantity go below 0', () => {
      const state = orderReducer(orderOf([pie, 0]), { type: 'decrement', productId: pie.id });

      expect(state).toEqual([]);
      expect(getItemCount(state)).toBe(0);
    });

    it('ignores a product that is not in the order', () => {
      const before = orderOf([pie, 1]);
      const after = orderReducer(before, { type: 'decrement', productId: milk.id });

      expect(after).toBe(before);
    });
  });

  describe('remove', () => {
    it('drops the line whatever its quantity', () => {
      const state = orderReducer(orderOf([pie, 5], [milk, 1]), {
        type: 'remove',
        productId: pie.id,
      });

      expect(state).toEqual(orderOf([milk, 1]));
    });

    it('ignores a product that is not in the order', () => {
      const state = orderReducer(orderOf([pie, 1]), { type: 'remove', productId: milk.id });

      expect(state).toEqual(orderOf([pie, 1]));
    });
  });

  describe('clear', () => {
    it('empties the order', () => {
      const state = orderReducer(orderOf([pie, 2], [milk, 1]), { type: 'clear' });

      expect(state).toEqual([]);
    });

    it('keeps the same reference when the order is already empty', () => {
      expect(orderReducer(initialOrderState, { type: 'clear' })).toBe(initialOrderState);
    });
  });

  it('does not mutate the state it is given', () => {
    const before = orderOf([pie, 1]);
    const snapshot = JSON.stringify(before);

    orderReducer(before, { type: 'add', product: pie });
    orderReducer(before, { type: 'increment', productId: pie.id });
    orderReducer(before, { type: 'decrement', productId: pie.id });
    orderReducer(before, { type: 'remove', productId: pie.id });
    orderReducer(before, { type: 'clear' });

    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('getOrderTotalCents', () => {
  it('is 0 for an empty order', () => {
    expect(getOrderTotalCents(initialOrderState)).toBe(0);
  });

  it('multiplies price by quantity across every line', () => {
    expect(getOrderTotalCents(orderOf([pie, 2], [milk, 3]))).toBe(450 * 2 + 280 * 3);
  });
});

describe('getItemCount', () => {
  it('is 0 for an empty order', () => {
    expect(getItemCount(initialOrderState)).toBe(0);
  });

  it('counts every unit, not every line', () => {
    expect(getItemCount(orderOf([pie, 2], [milk, 3]))).toBe(5);
  });
});
