import { render, screen } from '@testing-library/react-native';

import App from '../../App';
import { resetMockApiFailures } from '../api/mockApi';

afterEach(resetMockApiFailures);

describe('App', () => {
  it('renders the product list screen', async () => {
    render(<App />);

    expect(screen.getByText('Loading menu…')).toBeOnTheScreen();

    expect(await screen.findByText('Beef Pie', {}, { timeout: 2000 })).toBeOnTheScreen();
    expect(screen.getByText('Hot Food')).toBeOnTheScreen();
  });
});
