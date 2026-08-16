import request from 'supertest';
import app from '../../src/app';
import { describe, expect, it } from 'vitest';

describe('GET api/health', () => {
    it('should return HTTP 200 and correct status body', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'ok',
            service: 'TokTickIT API'
        })

    })
})