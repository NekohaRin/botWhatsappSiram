import express from "express";
import { startWhatsAppBot } from "./services/whatsapp.js";

const app = express();
app.use(express.json());

// Jalankan server ESP simulasi di port 4000

// Jalankan bot WhatsApp
startWhatsAppBot();

// Endpoint untuk cek server aktif
app.get("/", (req, res) => {
  res.json({ status: "Server aktif", waktu: new Date() });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server berjalan di port ${PORT}`);
});
