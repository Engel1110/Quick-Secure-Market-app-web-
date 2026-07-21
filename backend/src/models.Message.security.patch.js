/*
Agrega estos campos al messageSchema, cerca de isFlagged/riskLevel:

securityScore: {
  type: Number,
  min: 0,
  max: 100,
  default: 0
},

securityReasons: {
  type: [
    {
      code: String,
      level: String,
      title: String,
      recommendation: String
    }
  ],
  default: []
},

reportedBy: [
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
],

No elimines los campos existentes:
isFlagged
riskLevel
aiReason
*/
