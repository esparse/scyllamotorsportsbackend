const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },

    sender: {
      userId: mongoose.Schema.Types.ObjectId,
      role: String
    },

    type: {
      type: String,
      enum: ["TEXT", "SYSTEM"],
      default: "TEXT"
    },

    content: {
      type: String,
      required: true
    },

    readBy: [
      {
        userId: mongoose.Schema.Types.ObjectId
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
