const sendMail = require("../utils/mailer");
const vendorModel = require("../models/Vendor");
const Subscription = require("../models/Subscription");

// contact page form
const sendContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const sendMail = require("../utils/mailer");
    await sendMail({
      to: process.env.EMAIL_USER,
      subject: `Contact Us Message from ${name}: ${subject}`,
      text: `From: ${name} (${email})\n\n${message}`,
    });
    return res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to send email", message: err.message });
  }
};

// particular product enquiry form for vendor
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

  if (
    !name ||
    !email ||
    !subject ||
    !message ||
    !team_name ||
    !competition_type ||
    !quantity
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const vendor = await vendorModel.findOne({ _id: req.body.vendor_id });
    await sendMail({
      to: vendor ? vendor.email : process.env.EMAIL_USER, // send to vendor if vendor_id is provided and valid, otherwise send to default contact email
      subject: `Vendor Enquiry from ${name}: ${subject}`,
      text: `Team: ${team_name} \n Contact: ${name} (${email}) \n Competition: ${competition_type} \n Quantity: ${quantity} \n Message: ${message}`,
    });

    return res.status(200).json({
      message: "Enquiry sent successfully",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to send enquiry", details: err.message });
  }
};

// product overview quote request form (vendor page)
const sendQuoteRequest = async (req, res) => {
  const { name, email, subject, userMessage, inquiry_type } = req.body;

  if (!name || !email || !subject || !userMessage || !inquiry_type) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const vendor = await vendorModel.findOne({ _id: req.body.vendor_id });
    await sendMail({
      to: vendor ? vendor.email : process.env.EMAIL_USER, // send to vendor if vendor_id is provided and valid, otherwise send to default contact email
      subject: `Quote Request from ${name}: ${subject}`,
      text: `Inquiry Type: ${inquiry_type} \n Contact: ${name} (${email}) \n Message: ${userMessage}`,
    });

    return res.status(200).json({
      message: "Quote request sent successfully",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to send quote request", details: err.message });
  }
};

// Subsctiption
const subcriptionEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const existing = await Subscription.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email is already subscribed" });
    }

    const subscription = new Subscription({ email });
    await subscription.save();
    return res.status(200).json({ message: "Subscribed successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to subscribe", message: err.message });
  }
};

module.exports = {
  sendContactMessage,
  vendorEnquiryMessage,
  sendQuoteRequest,
  subcriptionEmail,
};
