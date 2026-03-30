const sendMail = require("../utils/mailer");
const vendorModel = require("../models/Vendor");
const Subscription = require("../models/Subscription");
const Inquiry = require("../models/Inquiry");
const Product = require("../models/Product");

// contact page form frontend
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

// particular product enquiry form for vendor frontend
const vendorEnquiryMessage = async (req, res) => {
  const {
    name,
    email,
    subject,
    message,
    team_name,
    competition_type,
    quantity,
    vendor_id,   
    productId,  
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

  //  Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    //  Fetch vendor
    const vendor = await vendorModel.findById(vendor_id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    //  Fetch product if productId provided — optional since enquiry
    let product = null;
    if (productId) {
      product = await Product.findById(productId).lean();
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
    }

    const inquiry = await Inquiry.create({
      name,
      email,
      subject,
      message,
      team_name,
      competition_type,
      quantity,
      vendor: vendor._id,          
      product: product?._id || null, 
      status: "new",
    });

    await sendMail({
      to: vendor.email,
      subject: `Vendor Enquiry from ${name}: ${subject}`,
      text: `
        Team        : ${team_name}
        Contact     : ${name} (${email})
        Competition : ${competition_type}
        Quantity    : ${quantity}
        Product     : ${product?.title || "General enquiry"}
        Message     : ${message}
      `,
    });

    return res.status(200).json({
      message: "Enquiry sent successfully",
      inquiry,
    });

  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ error: `Invalid ID format: ${err.path}` });
    }
    return res.status(500).json({ error: "Failed to send enquiry", details: err.message });
  }
};

// product overview quote request form (vendor page) from frontend
const sendQuoteRequest = async (req, res) => {
  const { name, email, subject, userMessage, inquiry_type, vendor_id } = req.body;

  if (!name || !email || !subject || !userMessage || !inquiry_type) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (vendor_id && !mongoose.Types.ObjectId.isValid(vendor_id)) {
    return res.status(400).json({ error: "Invalid vendor_id format" });
  }

  try {

    const vendor = vendor_id
      ? await vendorModel.findById(vendor_id).lean()
      : null;

    await Quote.create({
      name,
      email,
      subject,
      message: userMessage,
      inquiry_type,
      vendor: vendor?._id || null,
    });

    await sendMail({
      to: vendor ? vendor.email : process.env.EMAIL_USER,
      subject: `Quote Request from ${name}: ${subject}`,
      text: `Inquiry Type: ${inquiry_type}\nContact: ${name} (${email})\nMessage: ${userMessage}`,
    });

    return res.status(200).json({
      message: "Quote request sent successfully",
    });

  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ error: `Invalid ID format: ${err.path}` });
    }
    return res.status(500).json({ error: "Failed to send quote request", details: err.message });
  }
};

// Subsctiption frontend 
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
