const ESP_IP = "192.168.18.90";

// ==============================
// KIRIM PERINTAH SIRAM
// ==============================
export async function triggerPump(duration) {
  try {
    const url = `http://${ESP_IP}/siram?menit=${duration}`;
    console.log("🔗 Mengirim request ke ESP32:", url);

    const res = await fetch(url);
    const text = await res.text();

    console.log("✅ Respons ESP32:", text);
    return text;

  } catch (err) {
    console.error("❌ Gagal menghubungi ESP32:", err.message);
    return null;
  }
}

// ==============================
// PERINTAH STOP
// ==============================
export async function stopPump() {
  try {
    const url = `http://${ESP_IP}/stop`;
    const res = await fetch(url);
    const text = await res.text();
    console.log("🛑 Pompa dimatikan:", text);
    return text;
  } catch (err) {
    console.error("❌ Gagal stop ESP32:", err.message);
    return null;
  }
}

// ==============================
// CEK STATUS
// ==============================
export async function getPumpStatus() {
  try {
    const url = `http://${ESP_IP}/status`;
    const res = await fetch(url);
    const json = await res.json();
    console.log("📊 Status pompa:", json);
    return json;
  } catch (err) {
    console.error("❌ Gagal mengambil status:", err.message);
    return null;
  }
}

// ==============================
// PARSER PERINTAH WHATSAPP
// ==============================
export async function execCommand(messageText) {
  try {
    const regex = /siram\s+(\d+)\s*menit/i;
    const match = messageText.match(regex);

    if (match) {
      const menit = parseInt(match[1]);
      const url = `http://${ESP_IP}/siram?menit=${menit}`;

      const res = await fetch(url);
      const text = await res.text();

      console.log("Respon dari ESP32:", text);

      return `✅ Penyiraman selama ${menit} menit telah dimulai.`;
    }

    return null;

  } catch (error) {
    console.error("❌ Gagal kirim ke ESP32:", error.message);
    return "⚠️ Gagal menghubungi perangkat penyiraman.";
  }
}
