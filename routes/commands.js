import express from 'express';
const router = express.Router();
import pino from 'pino';
const log = pino();


router.post('/command', (req, res) => {
const { deviceId, cmd, minutes, meta } = req.body;
if (!deviceId || !cmd) return res.status(400).json({ error: 'deviceId & cmd required' });


// simple validation
const payload = { cmd, minutes: minutes || 0, meta: meta || {} };


const ws = global.__smartSiram_ws;
if (!ws) return res.status(500).json({ error: 'ws server not initialized' });


const result = ws.sendCommandToDevice(deviceId, payload);


if (result.status === 'sent') {
return res.json({ status: 'sent', cmdId: result.cmdId });
}


return res.json({ status: 'device-offline', cmdId: result.cmdId });
});


export default router;