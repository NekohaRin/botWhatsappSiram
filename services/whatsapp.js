import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import P from "pino";
import { triggerPump } from "./esp.js";
import { execCommand } from "../controllers/commands.js";


export async function startWhatsAppBot() {
  const logger = P({ level: "silent" });
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info_baileys");

  const { version } = await fetchLatestBaileysVersion();
  console.log("📱 Menggunakan versi WhatsApp:", version.join("."));

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["Smart Siram", "Chrome", "10.0"]
  });

  // Tampilkan QR manual
  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log("🔐 Scan QR berikut untuk login:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Terlogout, hapus sesi lalu login ulang.");
      } else {
        console.log("⚠️ Koneksi terputus. Coba sambung ulang...");
        startWhatsAppBot(); // auto reconnect
      }
    } else if (connection === "open") {
      console.log("✅ Terhubung ke WhatsApp!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
  const msg = messages[0];
  if (!msg.message || msg.key.fromMe) return;

  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

  const response = await execCommand(text.toLowerCase());
  if (response) {
    await sock.sendMessage(msg.key.remoteJid, { text: response });
  }
});

}
