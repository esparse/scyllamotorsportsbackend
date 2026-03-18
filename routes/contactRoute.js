const express = require("express");
const router = express.Router();
const { sendContactMessage,vendorEnquiryMessage, sendQuoteRequest } = require("../controllers/contactus");

// contact page form
router.post("/contact", sendContactMessage);

router.get("/", (req, res) => {
  res.send("Contact API is working");
});

// enquiry about parts 
router.post("/vendor-enquiry", vendorEnquiryMessage);

// vendor quote request form
router.post("/vendor-quote", sendQuoteRequest);

// subscription for updates and newsletters
router.post("/subscribe", subcriptionEmail);

module.exports = router;