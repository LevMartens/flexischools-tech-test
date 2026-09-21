import { render, screen, userEvent } from '@testing-library/react-native';

import { fetchProducts } from '../../api/mockApi';
import type { Product } from '../../types';
import ProductListScreen from '../ProductListScreen';

jest.mock('../../api/mockApi', () => ({
  fetchProducts: jest.fn(),
  submitOrder: jest.fn(),
}));

const mockFetchProducts = jest.mocked(fetchProducts);

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

beforeEach(() => {
  mockFetchProducts.mockResolvedValue([pie, milk]);
});

afterEach(() => {
  jest.clearAllMocks();
});

/** Renders the screen and waits for the mocked menu to arrive. */
async function renderLoadedScreen() {
  render(<ProductListScreen />);
  await screen.findByText(pie.name);
}

describe('ProductListScreen', () => {
  it('updates the summary total when an item is added', async () => {
    const user = userEvent.setup();
    await renderLoadedScreen();

    expect(screen.getByText('0 items · $0.00')).toBeOnTheScreen();

    await user.press(screen.getByLabelText(`Add ${pie.name} to order`));

    expect(screen.getByText('1 item · $4.50')).toBeOnTheScreen();

    await user.press(screen.getByLabelText(`Add ${milk.name} to order`));

    expect(screen.getByText('2 items · $7.30')).toBeOnTheScreen();
  });

  it('disables the Review button while the order is empty', async () => {
    const user = userEvent.setup();
    await renderLoadedScreen();

    expect(screen.getByLabelText('Review order')).toBeDisabled();

    await user.press(screen.getByLabelText(`Add ${pie.name} to order`));

    expect(screen.getByLabelText('Review order')).toBeEnabled();
  });
});
