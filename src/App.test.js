import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login screen when no session is stored', () => {
  render(<App />);
  const heading = screen.getByText(/song swiper/i);
  expect(heading).toBeInTheDocument();
});
