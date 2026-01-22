const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,       // TLS port
  secure: false,   // must be false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // App password
  }
});

const sendMail = async ({ to, subject, text, html }) => {
  if (!to || !to.trim()) {
    throw new Error("No recipient provided to send email");
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: to.trim(),
    subject,
    text,
    html,
  });
};

module.exports = sendMail;
