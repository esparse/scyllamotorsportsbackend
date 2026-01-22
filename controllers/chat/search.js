const Team = require("../../models/Team");
const Vendor = require("../../models/Vendor");
const Admin = require("../../models/Admin");

exports.searchUsers = async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  const regex = new RegExp(q, "i");

  const teams = await Team.find({ name: regex, status: "approved" })
    .select("_id name logo")
    .lean();

  const vendors = await Vendor.find({ businessName: regex, status: "approved" })
    .select("_id businessName logo")
    .lean();

  const admins = await Admin.find({ name: regex })
    .select("_id name")
    .lean();

  const results = [
    ...teams.map(t => ({
      _id: t._id,
      name: t.name,
      avatar: t.logo,
      role: "TEAM"
    })),
    ...vendors.map(v => ({
      _id: v._id,
      name: v.businessName,
      avatar: v.logo,
      role: "VENDOR"
    })),
    ...admins.map(a => ({
      _id: a._id,
      name: a.name,
      role: "ADMIN"
    }))
  ];

  res.json(results);
};
