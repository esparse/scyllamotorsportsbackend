const TeamActivity = require("../models/TeamActivity");

/**
 * Central activity logger
 * @param {ObjectId} teamId
 * @param {String} type
 * @param {String} title
 * @param {String} message
 * @param {Object} meta (optional)
 */
const logTeamActivity = async (
  teamId,
  type,
  title,
  message,
  meta = {}
) => {
  try {
    if (!teamId) return;

    await TeamActivity.create({
      team: teamId,
      type,
      title,
      message,
      meta
    });
  } catch (err) {
    console.error("❌ Activity log failed:", err.message);
  }
};

module.exports = logTeamActivity;
