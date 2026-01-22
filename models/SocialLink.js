const mongoose = require("mongoose");

const SocialLinkSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  platform: String,
  handle: String,
  url: String,
  icon: String
});

module.exports = mongoose.model("SocialLink", SocialLinkSchema);
