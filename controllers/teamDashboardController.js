const getTeamProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });

    let teamProfile = null;

    if (req.user.role === "TEAM_ADMIN") {
      // TEAM_ADMIN is the team itself, so _id matches Team document
      teamProfile = await Team.findById(req.user.id).lean();
    } else if (req.user.role === "MEMBER") {
      const member = await Member.findById(req.user.id).lean();
      if (!member) return res.status(404).json({ error: "Member not found" });
      teamProfile = await Team.findById(member.team).lean();
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    if (!teamProfile) return res.status(404).json({ error: "Team not found" });

    const teamId = teamProfile._id;

    const mediaUrls = (teamProfile.media || []).map(
      (file) => `${req.protocol}://${req.get("host")}/${file}`
    );

    const teamMembers = await Member.find({ team: teamId }).lean();

    return res.json({
      ...teamProfile,
      media: mediaUrls,
      achievements: teamProfile.achievements || [],
      gallery: teamProfile.gallery || [],
      members: teamMembers || [],
      currentMember: req.user.role === "MEMBER" ? req.user : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal Server error", err: err.message });
  }
};