import dotenv from 'dotenv';
dotenv.config();


const TOKENS = new Map();
// load allowed devices from env var DEVICES as comma separated deviceId:token
// Example: DEVICES=esp01:tok1,esp02:tok2
const DEVICES_STR = process.env.DEVICES || '';
if (DEVICES_STR) {
DEVICES_STR.split(',').forEach(pair => {
const [id, token] = pair.split(':');
if (id && token) TOKENS.set(id.trim(), token.trim());
});
}


export function validateToken(deviceId, token) {
if (!deviceId || !token) return false;
const expected = TOKENS.get(deviceId);
if (!expected) return false;
return expected === token;
}