import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../App';

describe('UI-01: TokTickIT Heading Renders', () => {
  it('renders the TokTickIT heading correctly', () => {
    render(<App />);
    const heading = screen.getByText(/TokTickIT IT Service Desk/i);
    expect(heading).toBeInTheDocument();
  });
});
