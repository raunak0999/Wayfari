import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Wayfari Backend Service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
