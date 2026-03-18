const sendMail = require("../utils/mailer");
const vendorModel = require("../models/Vendor");

// contact page form
const sendContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const sendMail = require("../utils/mailer");
    await sendMail({
      to: process.env.CONTACT_EMAIL,
      subject: `Contact Us Message from ${name}: ${subject}`,
      message: `From: ${name} (${email})\n\n${message}`,
    });
    return res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to send email", message: err.message });
  }
};

// particular vendor enquiry form
const vendorEnquiryMessage = async (req, res) => {
  const {
    name,
    email,
    subject,
    message,
    team_name,
    competition_type,
    quantity,
  } = req.body;

  if (    !name || !email || !subject || !message || !team_name || !competition_type || !quantity) {
    return res.status(400).json({ error: "All fields are required", });
  }

  try {
      const vendor = await vendorModel.findOne({ _id: req.body.vendor_id });
    await sendMail({
      to: vendor ? vendor.email : process.env.EMAIL_USER, // send to vendor if vendor_id is provided and valid, otherwise send to default contact email
      subject: `Vendor Enquiry from ${name}: ${subject}`,
      message: `Team: ${team_name}
                Contact: ${name} (${email})
                Competition: ${competition_type}
                Quantity: ${quantity}
                Message: ${message}`,
    });

    return res.status(200).json({
      message: "Enquiry sent successfully",
    });
  } catch (err) {
    return res.status(500).json({error: "Failed to send enquiry",details: err.message,});
  }
};

// product overview quote request form
const sendQuoteRequest = async (req, res) => {
  const { name, email, subject, message, inquiry_type,} = req.body;

  if (!name || !email || !subject || !message || !inquiry_type) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const vendor = await vendorModel.findOne({ _id: req.body.vendor_id });
    await sendMail({
      to: vendor ? vendor.email : process.env.EMAIL_USER, // send to vendor if vendor_id is provided and valid, otherwise send to default contact email
      subject: `Quote Request from ${name}: ${subject}`,
      message: `Inquiry Type: ${inquiry_type}
                Contact: ${name} (${email})
                Message: ${message}`,
    });

    return res.status(200).json({
      message: "Quote request sent successfully",
    });
  } catch (err) {
    return res.status(500).json({error: "Failed to send quote request",details: err.message,});
  }
};

module.exports = {
  sendContactMessage,
  vendorEnquiryMessage,
  sendQuoteRequest
};
