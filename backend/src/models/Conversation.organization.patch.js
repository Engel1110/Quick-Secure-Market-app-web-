/* Agrega antes de conversationSchema */
const pinnedConversationSchema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},order:{type:Number,default:1,min:1},pinnedAt:{type:Date,default:Date.now}},{_id:false});
const assignedConversationLabelSchema=new mongoose.Schema({label:{type:mongoose.Schema.Types.ObjectId,ref:"ConversationLabel",required:true},assignedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},assignedAt:{type:Date,default:Date.now}},{_id:false});
/* Agrega dentro de conversationSchema */
favoriteBy:[{type:mongoose.Schema.Types.ObjectId,ref:"User"}],
pinnedBy:{type:[pinnedConversationSchema],default:[]},
archivedBy:[{type:mongoose.Schema.Types.ObjectId,ref:"User"}],
labels:{type:[assignedConversationLabelSchema],default:[]},
category:{type:String,enum:["GENERAL","BUY","SELL","SUPPORT","DISPUTE"],default:"GENERAL",index:true},
priority:{type:String,enum:["LOW","NORMAL","HIGH","CRITICAL"],default:"NORMAL",index:true},
organizationStats:{totalMessages:{type:Number,default:0},totalAttachments:{type:Number,default:0},aiAlerts:{type:Number,default:0},reports:{type:Number,default:0}},
organizationAudit:{lastCategoryUpdate:Date,lastPinnedAt:Date,lastArchivedAt:Date,lastFavoriteAt:Date}
/* Índices */
conversationSchema.index({participants:1,category:1,priority:1,updatedAt:-1});
conversationSchema.index({favoriteBy:1,updatedAt:-1});
conversationSchema.index({archivedBy:1,updatedAt:-1});
conversationSchema.index({"pinnedBy.user":1,"pinnedBy.order":1});
conversationSchema.index({"labels.label":1,"labels.assignedBy":1});
