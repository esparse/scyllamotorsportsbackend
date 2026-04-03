const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    participants: [
      {
        team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
        driver: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
        status: {
          type: String,
          enum: ["registered", "approved", "rejected"],
          default: "registered",
        },
        position: Number,
      },
    ],
  },
  { timestamps: true }
);

// auto update team stats after every event save
eventSchema.post("save", async function () {
  const Team = mongoose.model("Team");

  for (const participant of this.participants) {
    if (participant.status !== "approved") continue;

    const winner = this.participants.find((p) => p.position === 1);
    const isWinner = winner?.team.toString() === participant.team.toString();

    await Team.findByIdAndUpdate(participant.team, {
      $inc: {
        eventsParticipated: 1,
        eventsWon: isWinner ? 1 : 0,
      },
    });
  }
});

module.exports = mongoose.model("Event", eventSchema);