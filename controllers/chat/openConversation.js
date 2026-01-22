const Conversation = require("../../models/Conversation");

exports.openConversation = async (req, res) => {
  const { targetUserId, targetRole } = req.body;

  const myId = req.user._id;
  const myRole = req.user.role;

  // Check existing conversation
  let conversation = await Conversation.findOne({
    participants: {
      $all: [
        { $elemMatch: { userId: myId } },
        { $elemMatch: { userId: targetUserId } }
      ]
    }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [
        { userId: myId, role: myRole },
        { userId: targetUserId, role: targetRole }
      ]
    });
  }

  res.json(conversation);
};
