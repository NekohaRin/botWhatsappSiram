// wsServer.js
import { WebSocketServer } from "/";
import { randomUUID } from "crypto";
import { validateToken } from "./lib/auth.js";

/**
 * Setup websocket server attached to existing http server.
 * Exports function setupWebSocketServer(server, { logger })
 *
 * Behaviour:
 * - devices connect and send hello: { type: "hello", deviceId, auth, firmware }
 * - server validates token via lib/auth.validateToken
 * - server keeps map deviceId -> ws
 * - exposes global.__smartSiram_ws with method sendCommandToDevice(deviceId, payload)
 *   which returns { status: 'sent'|'device-offline', cmdId }
 * - server heartbeats clients (ping) and expects pong (isAlive)
 */

export function setupWebSocketServer(server, { logger = console } = {}) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  // map deviceId -> ws
  const devices = new Map();

  // utility to send command to specific device
  function sendCommandToDevice(deviceId, payload) {
    const ws = devices.get(deviceId);
    const cmdId = randomUUID();
    const envelope = {
      type: "cmd",
      id: cmdId,
      cmd: payload.cmd,
      minutes: payload.minutes || 0,
      meta: payload.meta || {}
    };

    if (!ws || ws.readyState !== ws.OPEN) {
      logger.warn(`device ${deviceId} is offline`);
      return { status: "device-offline", cmdId };
    }

    try {
      ws.send(JSON.stringify(envelope));
      logger.info(`Sent cmd ${cmdId} -> ${deviceId}`);
      return { status: "sent", cmdId };
    } catch (err) {
      logger.error("sendCommandToDevice error:", err);
      return { status: "device-offline", cmdId };
    }
  }

  // attach helper globally for routes to use
  global.__smartSiram_ws = {
    sendCommandToDevice
  };

  wss.on("connection", (ws, req) => {
    logger.info("New WS connection from", req.socket.remoteAddress);

    ws.isAlive = true;
    ws.deviceId = null;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw) => {
      const text = raw.toString();
      logger.info("WS <<", text);

      // try parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        logger.warn("Invalid JSON from client, ignoring");
        return;
      }

      // handle hello/auth
      if (data.type === "hello") {
        const { deviceId, auth } = data;
        if (!deviceId || !auth) {
          ws.send(JSON.stringify({ type: "error", msg: "hello missing deviceId/auth" }));
          ws.terminate();
          return;
        }

        // validate token using lib/auth.js
        if (!validateToken(deviceId, auth)) {
          logger.warn(`Authentication failed for device ${deviceId}`);
          ws.send(JSON.stringify({ type: "error", msg: "auth failed" }));
          ws.terminate();
          return;
        }

        // success: register device
        ws.deviceId = deviceId;
        devices.set(deviceId, ws);
        logger.info(`Device authenticated: ${deviceId}`);
        ws.send(JSON.stringify({ type: "welcome", ok: true }));

        return;
      }

      // handle ping from ESP (json ping)
      if (data.type === "ping") {
        // reply with pong json
        ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
        return;
      }

      // ack/result from device (log or forward)
      if (data.type === "ack" || data.type === "result") {
        logger.info(`From ${ws.deviceId || "unknown"}: ${JSON.stringify(data)}`);
        // optionally persist to DB or forward to WhatsApp bot (if needed)
        return;
      }

      // other custom messages...
    });

    ws.on("close", () => {
      logger.info("WS closed for device", ws.deviceId);
      if (ws.deviceId) devices.delete(ws.deviceId);
    });

    ws.on("error", (err) => {
      logger.error("WS error:", err);
      if (ws.deviceId) devices.delete(ws.deviceId);
    });
  });

  // server->client heartbeat (server ping; clients must respond with pong)
  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.isAlive === false) {
        logger.warn("Terminating unresponsive client", client.deviceId);
        client.terminate();
        if (client.deviceId) devices.delete(client.deviceId);
        return;
      }
      client.isAlive = false;
      try {
        client.ping();
      } catch (e) {
        logger.error("ping error:", e);
      }
    });
  }, 15000);

  wss.on("close", () => clearInterval(interval));

  logger.info("WebSocket server initialized (path /ws)");
}
