import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../App';

describe('UI-03: API Failure Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays a useful error message when API fails', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Network Error'))
    );

    render(<App />);

    const button = screen.getByTestId('check-system-btn');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('system-status')).toHaveTextContent('System Status: Offline');
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Unable to connect to TokTickIT API'
      );
    });
  });
});
