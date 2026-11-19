import nodemailer from 'nodemailer';

const transporte = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

const remetente = process.env.EMAIL_FROM || 'Ajuda Aí <nao-responda@ajudaai.app>';
export const urlDoSite = () => process.env.APP_URL || 'http://localhost:5173';

// Nos testes, os e-mails ficam aqui para serem conferidos.
export const caixaDeSaida = [];

// Nunca lança erro: se o envio falhar, a operação principal continua e a falha é registrada.
export async function enviarEmail(para, assunto, texto) {
  try {
    if (process.env.NODE_ENV === 'test') {
      caixaDeSaida.push({ para, assunto, texto });
      return;
    }
    if (!transporte) {
      console.log(`\n[e-mail] Para: ${para}\nAssunto: ${assunto}\n${texto}\n`);
      return;
    }
    await transporte.sendMail({ from: remetente, to: para, subject: assunto, text: texto });
  } catch (erro) {
    console.error(`[e-mail] Falha ao enviar para ${para}: ${erro.message}`);
  }
}

export const formatarData = (data) =>
  new Date(data).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'short',
  });
