export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalForCron = globalThis;
  if (globalForCron.__weeklyBackupScheduled) return;
  globalForCron.__weeklyBackupScheduled = true;

  const cron = await import("node-cron");
  const { sendWeeklyBackup } = await import("./lib/backup.js");

  // Todos los lunes a las 06:00, hora del servidor.
  cron.schedule("0 6 * * 1", () => {
    sendWeeklyBackup().catch((err) =>
      console.error("[backup] Error al enviar el backup semanal:", err)
    );
  });
}
