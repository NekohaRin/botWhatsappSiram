import express from 'express';
const router = express.Router();
import pino from 'pino';
const log = pino();

// POST /api/command
router.post('/command', async (req, res) => {
  try {
    const { deviceId, cmd, minutes, meta } = req.body;
    if (!deviceId || !cmd) return res.status(400).json({ error: 'deviceId & cmd required' });

    const payload = { cmd, minutes: minutes || 0, meta: meta || {} };

    const wsManager = global.__smartSiram_ws;
    if (!wsManager) return res.status(500).json({ error: 'ws server not initialized' });

    const result = wsManager.sendCommandToDevice(deviceId, payload);

    if (result.status === 'sent') {
      return res.json({ status: 'sent', cmdId: result.cmdId });
    } else {
      return res.status(503).json({ status: 'device-offline', cmdId: result.cmdId });
    }
  } catch (err) {
    log.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export default router;
