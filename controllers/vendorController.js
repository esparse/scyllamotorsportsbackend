const Vendor = require("../models/Vendor");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const path = require("path")
// const CloudinaryStorage  = require("multer-storage-cloudinary");

// Multer temp storage
const upload = multer({ dest: "uploads/" });

// Upload middleware
exports.uploadVendorFiles = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
  { name: "verificationDoc", maxCount: 1 }
]);

// const galleryStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: "gallery",
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//     public_id: (req, file) =>
//       `gallery-${req.user._id}-${Date.now()}`
//   }
// });



// Register Vendor
exports.registerVendor = async (req, res) => {
  try {
    const {
      businessName,
      category,
      gstNumber,
      email,
      password,
      description,
      location,
    } = req.body;

    if (!req.files?.logo || !req.files?.banner || !req.files?.verificationDoc) {
      return res.status(400).json({ error: "All files are required" });
    }

    // Upload files to Cloudinary
    const logoUpload = await cloudinary.uploader.upload(
      req.files.logo[0].path,
      { folder: "vendors/logos" }
    );

    const bannerUpload = await cloudinary.uploader.upload(
      req.files.banner[0].path,
      { folder: "vendors/banners" }
    );

    const docUpload = await cloudinary.uploader.upload(
      req.files.verificationDoc[0].path,
      { folder: "vendors/docs", resource_type: "auto" }
    );

    // Cleanup temp files
    fs.unlinkSync(req.files.logo[0].path);
    fs.unlinkSync(req.files.banner[0].path);
    fs.unlinkSync(req.files.verificationDoc[0].path);

    const hashedPassword = await bcrypt.hash(password, 10);

    const vendor = new Vendor({
      businessName,
      category,
      gstNumber,
      email,
      password: hashedPassword,
      location,
      description,
      logo: logoUpload.secure_url,
      banner: bannerUpload.secure_url,
      verificationDoc: docUpload.secure_url
    });

    await vendor.save();

    res.status(201).json({
      success: true,
      message: "Vendor registered. Await admin approval."
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const jwt = require("jsonwebtoken");

// Vendor Login
exports.loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (vendor.status !== "approved") {
      return res.status(403).json({ error: "Account pending admin approval" });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: vendor._id, role: "vendor" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName,
        role: "vendor"
      }
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};


// get vendor data
exports.getVendorProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });

    let vendorProfile = null;
    let vendorId = null;

    if (req.user.role === "VENDOR") {
      vendorProfile = await Vendor.findById(req.user._id).lean();
      vendorId = vendorProfile._id;
    }
    const mediaUrls = (vendorProfile.media || []).map(
      (file) => `${req.protocol}://${req.get("host")}/${file}`
    );

    if (!vendorProfile) return res.status(404).json({ error: "Vendor not found" });

    // Include media URLs if needed
    // const mediaUrls = (teamProfile.media || []).map(
    //   (file) => `${req.protocol}://${req.get("host")}/${file}`
    // );

    // Fetch all members of this team
    // const teamMembers = await Member.find({ team: teamId }).lean();

    res.json({
      ...vendorProfile,
      media: mediaUrls,
      // achievements: teamProfile.achievements || [],
      // gallery: teamProfile.gallery || [],
      // members: teamMembers || [],               // array of team members
      //currentMember: req.user.role === "MEMBER" ? req.user : null, // optional
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }

}

// edit vendor profile
exports.editVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    // ===== Map frontend fields =====
    const { businessName, description, location, foundedYear, companyDesc } = req.body;

    if (businessName) vendor.businessName = businessName;
    if (description) vendor.description = description;
    if (location) vendor.location = location; // now frontend directly sends location
    if (foundedYear) vendor.createdAt = new Date(foundedYear); // convert string to Date
    if (companyDesc !== undefined) vendor.companyDesc = companyDesc;

    if (req.files?.logo) {
  const upload = await cloudinary.uploader.upload(
    req.files.logo[0].path,
    { folder: "vendors/logos" }
  );

  vendor.logo = upload.secure_url;
  fs.unlinkSync(req.files.logo[0].path);
}


    await vendor.save();

    res.json({ success: true, message: "Profile updated", vendor });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};




// vendor upload business hour
exports.updateBusinessHours = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const hoursObj = req.body.businessHours;
    if (!hoursObj) {
      return res.status(400).json({ error: "No business hours provided" });
    }

    // 🔥 Convert object → array (THIS FIXES THE ERROR)
    const formattedHours = Object.keys(hoursObj).map((day) => ({
      day,
      start: hoursObj[day].start || "",
      end: hoursObj[day].end || ""
    }));

    vendor.businessHours = formattedHours;
    await vendor.save();

    res.status(200).json({
      message: "Business hours updated",
      businessHours: vendor.businessHours
    });

  } catch (err) {
    console.error("UPDATE HOURS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};



// vendor upload gallery

// upload gallery at vendor profile
const uploadGallery1 = multer({
  storage: multer.memoryStorage()
});

exports.uploadGalleryMiddleware = uploadGallery1.array("gallery", 10);


const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "vendor-gallery" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    ).end(buffer);
  });
};


exports.uploadGallery = async (req, res) => {
  try {

    let vendorProfile = null;
    let vendorId = null;

    if (req.user.role === "VENDOR") {
      vendorProfile = await Vendor.findById(req.user._id);
      vendorId = vendorProfile._id;
    }

    let vendor = await Vendor.findById(req.user._id);

    if (!vendor) {
      return res.status(404).json({ error: "vendor not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // CloudinaryStorage gives URL in file.path
    const urls = [];

    for (const file of req.files) {
      const imageUrl = await uploadToCloudinary(file.buffer);
      urls.push(imageUrl);
    }


    vendor.gallery.unshift(...urls);
    await vendor.save();



    res.status(200).json({
      message: "Gallery uploaded successfully",
      gallery: vendor.gallery
    });
    console.log("REQ FILES:", req.files);
    console.log("REQ BODY:", req.body);


  } catch (err) {
    console.error("UPLOAD GALLERY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};


exports.uploadVendorMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const destFolder = path.join(__dirname, "../uploads/vendors/media");
    if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });

    const uniqueName = `${Date.now()}-${req.file.originalname}`;
    const newFilePath = path.join(destFolder, uniqueName);
    fs.renameSync(req.file.path, newFilePath);

    let vendorProfile = null;
    let vendorId = null;

    if (req.user.role === "VENDOR") {
      vendorProfile = await Vendor.findById(req.user._id);
      vendorId = vendorProfile._id;
    }

    let vendor = await Vendor.findById(req.user._id);

    vendor.media = vendor.media ? [...vendor.media, `uploads/vendors/media/${uniqueName}`] : [`uploads/vendors/media/${uniqueName}`];
    await vendor.save();

    const mediaUrls = vendor.media.map(f => `${req.protocol}://${req.get("host")}/${f}`);

    res.status(200).json({ message: "Media uploaded", media: mediaUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// fetch the list of vendor in landing page
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({})
      .select("name category logo location createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const formattedVendors = vendors.map(vendor => ({
      ...vendor,
      logo: vendor.logo
        ? `${req.protocol}://${req.get("host")}/${vendor.logo}`
        : null
    }));

    res.json(formattedVendors);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


// fetch the vendor data on landing page
exports.getPublicVendorProfile = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const mediaUrls = (vendor.media || []).map(
      file => `${req.protocol}://${req.get("host")}/${file}`
    );

    res.json({
      ...vendor,
      media: mediaUrls
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


exports.addVendorService = async (req, res) => {
  try {
    const vendorId = req.user._id;
    // from auth middleware
    const { name, icon } = req.body;

    if (!name || !icon) {
      return res.status(400).json({
        success: false,
        message: "Service name and icon are required"
      });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Prevent duplicate service names
    const exists = vendor.services.some(
      s => s.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Service already exists"
      });
    }

    vendor.services.push({ name, icon });
    await vendor.save();

    res.status(201).json({
      success: true,
      message: "Service added successfully",
      services: vendor.services
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.addProject = async (req, res) => {
  try {
    const vendorId = req.user._id; // from auth middleware
    const { title, desc, imageUrl } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Project title is required" });
    }

    let image = imageUrl || "";

    // Upload file to Cloudinary if exists
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "vendor-projects"
      });
      image = result.secure_url;

      // remove local temp file
      fs.unlinkSync(req.file.path);
    }

    const project = { title, desc, image };

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $push: { projects: project } },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(201).json({
      message: "Project added successfully",
      project
    });

  } catch (error) {
    console.error("Add Project Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};