import { Request, Response } from 'express';

export function workerAuth(req: Request, res: Response): boolean {
	const key = req.headers['x-worker-key'];
	if (!key || key !== process.env.WORKER_SECRET_KEY) {
		res
			.status(403)
			.json({ error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' } });
		return false;
	}
	return true;
}
