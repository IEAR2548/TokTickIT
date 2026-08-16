import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from '../../App';

describe('ErrorHandling Feature (UI-03)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays a useful error message when the backend is unavailable', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Failed to fetch'));

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /check system/i }));

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/system status: offline/i)).toBeInTheDocument();
    expect(screen.getByText(/unable to connect to toktickit api/i)).toBeInTheDocument();
  });
});