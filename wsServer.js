import { WebSocketServer } from 'ws';
import { validateToken } from './lib/auth.js';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';


// In-memory stores (simple). For production replace with Redis or DB.
export const clients = new Map(); // deviceId -> { ws, lastSeen, info }
export const pendingQueue = new Map(); // deviceId -> [ commands ]
export const events = new EventEmitter();


export function setupWebSocketServer(server, { logger } = {}) {
const wss = new WebSocketServer({ server, path: '/ws' });


wss.on('connection', (ws, req) => {
logger && logger.info('New ws connection incoming');


ws.isAlive = true;
ws._meta = { connectedAt: Date.now() };


ws.on('pong', () => {
ws.isAlive = true;
});


ws.on('message', (msg) => {
try {
const data = JSON.parse(msg.toString());
handleMessage(ws, data, logger);
} catch (err) {
logger && logger.error('Invalid ws message', err.message);
ws.send(JSON.stringify({ type: 'error', message: 'invalid-json' }));
}
});


ws.on('close', () => {
if (ws._meta && ws._meta.deviceId) {
clients.delete(ws._meta.deviceId);
logger && logger.info('device disconnected', ws._meta.deviceId);
}
});


ws.on('error', (err) => {
logger && logger.error('ws error', err.message);
});
});


// Ping clients to detect dead connections
const interval = setInterval(() => {
wss.clients.forEach((ws) => {
if (ws.isAlive === false) return ws.terminate();
ws.isAlive = false;
ws.ping();
});
}, 30000);


wss.on('close', () => clearInterval(interval));


function handleMessage(ws, data, logger) {
const type = data.type;
if (type === 'hello') {
const { deviceId, auth, firmware } = data;
if (!deviceId || !auth) {
ws.send(JSON.stringify({ type: 'error', message: 'missing-credentials' }));
return;
}


if (!validateToken(deviceId, auth)) {
ws.send(JSON.stringify({ type: 'error', message: 'auth-failed' }));
ws.close();
return;
}


ws._meta.deviceId = deviceId;
ws._meta.firmware = firmware || null;
ws._meta.lastSeen = Date.now();
clients.set(deviceId, { ws, lastSeen: Date.now(), info: { firmware } });


logger && logger.info('device registered', deviceId);
ws.send(JSON.stringify({ type: 'welcome', ok: true }));


// deliver pending commands if any
const q = pendingQueue.get(deviceId);
if (q && q.length) {
while (q.length) {
const cmd = q.shift();
_sendCommand(ws, cmd, logger);
}
}


return;
}


if (type === 'ping') {
if (ws._meta && ws._meta.deviceId) {
const meta = clients.get(ws._meta.deviceId);
if (meta) meta.lastSeen = Date.now();
}
// optional respond
return;
}


if (type === 'ack' || type === 'result') {
// just emit to interested server parts
events.emit('device:' + type, data);
return;
}


// unknown type
ws.send(JSON.stringify({ type: 'error', message: 'unknown-type' }));
}


function _sendCommand(ws, cmd, logger) {
try {
ws.send(JSON.stringify(cmd));
logger && logger.info('sent cmd to device', cmd.id);
} catch (err) {
logger && logger.error('failed send cmd', err.message);
}
}


// helper to send command (used by REST route)
function sendCommandToDevice(deviceId, cmdPayload) {
const record = clients.get(deviceId);
const cmdId = uuidv4();
const cmd = { type: 'cmd', id: cmdId, ...cmdPayload };


if (record && record.ws && record.ws.readyState === 1) {
_sendCommand(record.ws, cmd, logger);
return { status: 'sent', cmdId };
}


// device offline - enqueue
const arr = pendingQueue.get(deviceId) || [];
arr.push(cmd);
pendingQueue.set(deviceId, arr);
return { status: 'device-offline', cmdId };
}


// expose helper
global.__smartSiram_ws = { sendCommandToDevice, clients, pendingQueue, events };
}