import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from '../../App';

describe('HealthStatus Feature (UI-01)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays the backend status as Online based on a real API response', async () => {
    const mockHealthResponse = {
      status: 'ok',
      service: 'TokTickIT API',
    };
    const mockCategories = [
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ];

    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockHealthResponse,
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockCategories,
      } as Response);
    });

    const user = userEvent.setup();
    render(<App />);

    // Nothing shown until the button is clicked
    expect(screen.queryByTestId('success-state')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /check system/i }));

    await waitFor(() => {
      expect(screen.getByTestId('success-state')).toBeInTheDocument();
    });
    expect(screen.getByText(/system status: online/i)).toBeInTheDocument();
  });
});