// import express from "express";
// import { startWhatsAppBot } from "./services/whatsapp.js";

// const app = express();
// app.use(express.json());

// Jalankan server ESP simulasi di port 4000

// Jalankan bot WhatsApp
// startWhatsAppBot();

// Endpoint untuk cek server aktif
// app.get("/", (req, res) => {
//   res.json({ status: "Server aktif", waktu: new Date() });
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`🌐 Server berjalan di port ${PORT}`);
// });

import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import pino from 'pino';
import { setupWebSocketServer } from './wsServer.js';
import commandRouter from './routes/commands.js';


dotenv.config();
const log = pino();


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
import cors from 'cors';
app.use(cors());


// Health endpoint for Railway
app.get('/', (req, res) => {
res.json({ status: 'ok', uptime: process.uptime(), time: new Date() });
});


// API: commands
app.use('/api', commandRouter);


const PORT = process.env.PORT || 3000;


const server = http.createServer(app);


// Setup WebSocket server on same http server
setupWebSocketServer(server, { logger: log });


server.listen(PORT, () => {
log.info(`Server HTTP + WS running on port ${PORT}`);
});