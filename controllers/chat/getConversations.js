const Conversation = require("../../models/Conversation");

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate("participants", "name role")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};
