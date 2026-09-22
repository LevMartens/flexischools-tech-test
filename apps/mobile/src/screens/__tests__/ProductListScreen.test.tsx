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

/** Matches the message `fetchProducts` rejects with in `api/mockApi.ts`. */
const LOAD_ERROR = 'Unable to load the menu. Please try again.';

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

/**
 * A promise with its settle functions exposed, so a test can hold a load open
 * and assert on the loading state before letting the response through.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
}

describe('ProductListScreen', () => {
  describe('loading the menu', () => {
    it('shows the loading state until the menu arrives', async () => {
      const pending = deferred<Product[]>();
      mockFetchProducts.mockReturnValue(pending.promise);

      render(<ProductListScreen />);

      expect(screen.getByLabelText('Loading menu')).toBeOnTheScreen();
      expect(screen.getByText('Loading menu…')).toBeOnTheScreen();

      pending.resolve([pie, milk]);

      expect(await screen.findByText(pie.name)).toBeOnTheScreen();
      expect(screen.queryByText('Loading menu…')).not.toBeOnTheScreen();
    });

    it('shows the error and a retry button when the load fails', async () => {
      mockFetchProducts.mockRejectedValue(new Error(LOAD_ERROR));

      render(<ProductListScreen />);

      expect(await screen.findByText(LOAD_ERROR)).toBeOnTheScreen();
      expect(screen.getByLabelText('Retry loading the menu')).toBeOnTheScreen();
      expect(screen.queryByText('Loading menu…')).not.toBeOnTheScreen();
    });

    it('goes back to the loading state while a retry is in flight', async () => {
      const user = userEvent.setup();
      const pending = deferred<Product[]>();
      mockFetchProducts
        .mockRejectedValueOnce(new Error(LOAD_ERROR))
        .mockReturnValueOnce(pending.promise);

      render(<ProductListScreen />);
      await screen.findByText(LOAD_ERROR);

      await user.press(screen.getByLabelText('Retry loading the menu'));

      expect(screen.getByText('Loading menu…')).toBeOnTheScreen();
      expect(screen.queryByText(LOAD_ERROR)).not.toBeOnTheScreen();

      pending.resolve([pie, milk]);

      expect(await screen.findByText(pie.name)).toBeOnTheScreen();
    });

    it('recovers when the retry succeeds', async () => {
      const user = userEvent.setup();
      mockFetchProducts
        .mockRejectedValueOnce(new Error(LOAD_ERROR))
        .mockResolvedValue([pie, milk]);

      render(<ProductListScreen />);
      await screen.findByText(LOAD_ERROR);

      await user.press(screen.getByLabelText('Retry loading the menu'));

      expect(await screen.findByText(pie.name)).toBeOnTheScreen();
      expect(screen.getByText(milk.name)).toBeOnTheScreen();
      expect(screen.queryByText(LOAD_ERROR)).not.toBeOnTheScreen();
      expect(mockFetchProducts).toHaveBeenCalledTimes(2);
    });
  });

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
