import { WebSocketServer } from "ws";

export function setupWebSocketServer(server, { logger }) {
    const wss = new WebSocketServer({ server });

    logger.info("WebSocket server ready");

    wss.on("connection", (ws) => {
        logger.info("ESP32 connected");

        ws.isAlive = true;

        ws.on("pong", () => {
            ws.isAlive = true; // ESP32 masih hidup → GOOD
        });

        ws.on("message", (msg) => {
            const data = msg.toString();
            logger.info(`WS << ${data}`);

            let json;
            try {
                json = JSON.parse(data);
            } catch {
                logger.error("Invalid JSON");
                return;
            }

            // ============= HANDLE PING DARI ESP =============
            if (json.type === "ping") {
                ws.send(JSON.stringify({ type: "pong" }));
                return;
            }

            // ============= HANDLE HELLO =============
            if (json.type === "hello") {
                logger.info(`Device ${json.deviceId} authenticated`);
                return;
            }

            // ============= HANDLE COMMAND RESULT =============
            if (json.type === "result") {
                logger.info(`Command result: ${data}`);
                return;
            }
        });

        ws.on("close", () => logger.warn("ESP32 disconnected"));
        ws.on("error", (err) => logger.error("WS error:", err));
    });

    // ============= SERVER HEARTBEAT (IMPORTANT!) =============
    setInterval(() => {
        wss.clients.forEach((client) => {
            // kalau belum balas pong sebelumnya = mati
            if (!client.isAlive) {
                logger.warn("ESP32 not responding → dropping");
                return client.terminate();
            }

            client.isAlive = false;
            client.ping(); // server kirim ping → ESP harus balas "pong"
        });
    }, 15000);

}
