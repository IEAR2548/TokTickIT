import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from '../../App';

describe('CategoryList Feature (UI-02)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading state after clicking Check System, then the loading state changes to the category list', async () => {
    const mockCategories = [
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ];

    let resolveHealth: (value: Response) => void;
    const healthPromise = new Promise<Response>((resolve) => {
      resolveHealth = resolve;
    });

    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        } as Response);
      }
      // Health call stays pending until we resolve it manually,
      // so we can assert the loading state before data arrives.
      return healthPromise;
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /check system/i }));

    // Loading state visible while the health call is still pending
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();

    // Now let the health call resolve
    resolveHealth!({
      ok: true,
      json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByTestId('category-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Account and Access')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
  });
});