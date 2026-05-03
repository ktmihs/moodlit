import { Router } from 'express';
import { runBookSummaryWorker } from '../lib/summary';
import { runAiWorker } from '../lib/worker';
import { workerAuth } from '../middleware/workerAuth';

const router = Router();

router.post('/run', async (req, res) => {
	if (!workerAuth(req, res)) return;
	try {
		const result = await runAiWorker();
		res.json({ success: true, ...result });
	} catch (err) {
		res
			.status(500)
			.json({ error: { code: 'INTERNAL_ERROR', message: String(err) } });
	}
});

router.post('/run-book-summary', async (req, res) => {
	if (!workerAuth(req, res)) return;
	try {
		const result = await runBookSummaryWorker();
		res.json({ success: true, ...result });
	} catch (err) {
		res
			.status(500)
			.json({ error: { code: 'INTERNAL_ERROR', message: String(err) } });
	}
});

export default router;
