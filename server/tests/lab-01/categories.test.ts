import request from 'supertest';
import app from '../../src/app';
import { describe, expect, it } from 'vitest';

describe('GET /api/categories', () => {
    it('should return HTTP 200 and the four seeded categories in order', async () => {
        const response = await request(app).get('/api/categories');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(4);

        expect(response.body[0]).toMatchObject({ name: 'Account and Access' });
        expect(response.body[1]).toMatchObject({ name: 'Hardware' });
        expect(response.body[2]).toMatchObject({ name: 'Software' });
        expect(response.body[3]).toMatchObject({ name: 'Network' });

        // every item must have id and name
        response.body.forEach((category: { id: unknown; name: unknown }) => {
            expect(category).toHaveProperty('id');
            expect(category).toHaveProperty('name');
        });
    });
});