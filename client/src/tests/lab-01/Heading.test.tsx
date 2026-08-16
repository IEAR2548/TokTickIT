import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../App';

describe('Heading Feature (UI-01)', () => {
    it('renders the TokTickIT heading', () => {
        render(<App />);
        expect(screen.getByRole('heading', { name: /toktickit/i })).toBeInTheDocument();
    });
});