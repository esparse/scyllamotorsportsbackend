const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");

exports.sendMessage = async (req, res) => {
  const { conversationId, content, type = "TEXT" } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const isParticipant = conversation.participants.some(
    p => p.userId.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const message = await Message.create({
    conversationId,
    sender: {
      userId: req.user._id,
      role: req.user.role
    },
    type,
    content
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  // socket emit will be added in next phase
  res.json(message);
};
