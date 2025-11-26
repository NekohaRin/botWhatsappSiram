import express from "express";

// export function simulateESPServer() {
//   const app = express();
//   app.use(express.json());

//   app.post("/pump", (req, res) => {
//     const { duration } = req.body;
//     console.log(`🚰 [ESP SIMULATOR] Pompa menyala selama ${duration} menit`);
//     setTimeout(() => {
//       console.log("🛑 [ESP SIMULATOR] Pompa dimatikan otomatis");
//     }, duration * 1000); // simulasi cepat (1 detik = 1 menit)
//     res.json({ status: "ok", duration });
//   });

//   app.listen(4000, () => {
//     console.log("🧩 ESP simulator berjalan di port 4000");
//   });
// }

// Dipanggil dari bot

export async function triggerPump(duration) {
  // fallback quick HTTP to esp simulator (if you still use it)
  try {
    const res = await fetch(`http://localhost:4000/pump`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration })
    });
    return await res.json();
  } catch (err) {
    console.error("Failed to call ESP simulator", err.message);
    return null;
  }
}
