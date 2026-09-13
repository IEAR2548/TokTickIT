import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SystemCheck } from '../../pages/SystemCheck';

describe('Heading Feature (UI-01)', () => {
    it('renders the TokTickIT heading', () => {
        render(<MemoryRouter><SystemCheck /></MemoryRouter>);
        expect(screen.getByRole('heading', { name: /toktickit/i })).toBeInTheDocument();
    });
});