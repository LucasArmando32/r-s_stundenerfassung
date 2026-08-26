import { format, startOfYear } from "date-fns";
import { buildStundenrapport } from "./excel";
import { createTransport, isBackupEmailConfigured } from "./mailer";

// Sends the full year-to-date Stundenrapport by email to the jefa — a
// human-readable copy outside the server, in case something happens to it.
export async function sendWeeklyBackup() {
  if (!isBackupEmailConfigured()) {
    console.log("[backup] SMTP no configurado, se omite el envío semanal.");
    return;
  }

  const today = new Date();
  const fromYm = format(startOfYear(today), "yyyy-MM");
  const toYm = format(today, "yyyy-MM");

  const workbook = await buildStundenrapport(fromYm, toYm);
  const buffer = await workbook.xlsx.writeBuffer();

  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.BACKUP_EMAIL_TO,
    subject: `Stundenrapport – Backup semanal (${format(today, "dd.MM.yyyy")})`,
    text: "Copia de seguridad semanal automática de las horas registradas hasta hoy. Adjunto encontrarás el Excel completo del año en curso.",
    attachments: [
      {
        filename: `Stundenrapport_${fromYm}_${toYm}.xlsx`,
        content: Buffer.from(buffer),
      },
    ],
  });

  console.log("[backup] Backup semanal enviado por correo.");
}
