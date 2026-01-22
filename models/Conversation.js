const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        role: {
          type: String,
          enum: ["ADMIN", "TEAM", "VENDOR", "MEMBER"],
          required: true
        }
      }
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    }
  },
  { timestamps: true }
);

// Prevent duplicate 1-to-1 conversations
conversationSchema.index(
  { "participants.userId": 1 },
  { unique: false }
);

module.exports = mongoose.model("Conversation", conversationSchema);
