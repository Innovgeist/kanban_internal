import nodemailer from 'nodemailer';
import { config } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

const hasEmailConfig = () =>
  Boolean(
    config.email.host &&
      config.email.port &&
      config.email.user &&
      config.email.pass &&
      config.email.from
  );

const getTransporter = () => {
  if (!hasEmailConfig()) {
    throw new Error('SMTP configuration is incomplete');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  return transporter;
};

export const EmailService = {
  isConfigured() {
    return hasEmailConfig();
  },

  async sendMail(options: { to: string[]; subject: string; html: string; text: string }) {
    const client = getTransporter();

    return client.sendMail({
      from: config.email.from,
      to: options.to.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  },
};
