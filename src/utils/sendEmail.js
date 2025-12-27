import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const sendEmail = async ({ email, subject, html }) => {
  // 1. Tạo transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true cho port 465, false cho các port khác
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // 2. Cấu hình mail options
  const mailOptions = {
    from: `"Support Team" <${process.env.SMTP_EMAIL}>`, // Tên người gửi
    to: email, // Người nhận
    subject: subject,
    html: html, // Nội dung dạng HTML
  };

  // 3. Gửi mail
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email: ', error);
    throw new Error('EMAIL_SEND_FAILED');
  }
};