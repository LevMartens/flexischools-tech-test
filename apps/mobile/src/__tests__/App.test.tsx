import { render, screen } from '@testing-library/react-native';

import App from '../../App';

describe('App', () => {
  it('renders the starter message', () => {
    render(<App />);

    expect(screen.getByText(/Open up App.tsx to start working on your app!/)).toBeOnTheScreen();
  });
});
