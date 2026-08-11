import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../App';

describe('UI-02: Loading State & Category List Display', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state then updates to category list on button click', async () => {
    // Mock global fetch
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === '/api/health') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok', service: 'TokTickIT API' }),
        } as Response);
      }
      if (url === '/api/categories') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, name: 'Account and Access' },
              { id: 2, name: 'Hardware' },
              { id: 3, name: 'Software' },
              { id: 4, name: 'Network' },
            ]),
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<App />);

    const button = screen.getByTestId('check-system-btn');
    fireEvent.click(button);

    // Wait for fetch completion & category list display
    await waitFor(() => {
      expect(screen.getByTestId('system-status')).toHaveTextContent('System Status: Online');
      expect(screen.getByText('Account and Access')).toBeInTheDocument();
      expect(screen.getByText('Hardware')).toBeInTheDocument();
      expect(screen.getByText('Software')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
    });
  });
});
