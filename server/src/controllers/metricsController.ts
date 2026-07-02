import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as metricsService from '../services/metricsService';

export async function getOverview(req: AuthRequest, res: Response) {
    try {
        const data = await metricsService.getOverview();
        res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getQueueStats(req: AuthRequest, res: Response) {
    try {
        const data = await metricsService.getQueueStats();
        res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getWorkerStats(req: AuthRequest, res: Response) {
    try {
        const data = await metricsService.getWorkerStats();
        res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getThroughput(req: AuthRequest, res: Response) {
    try {
        const data = await metricsService.getThroughput();
        res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
