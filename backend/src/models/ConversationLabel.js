const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,maxlength:40},
  slug:{type:String,required:true,trim:true,lowercase:true,maxlength:50},
  color:{type:String,default:"#8b5cf6"},
  icon:{type:String,default:"tag"},
  isSystem:{type:Boolean,default:false},
  owner:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null},
  isActive:{type:Boolean,default:true}
},{timestamps:true});
schema.index({slug:1,owner:1},{unique:true});
module.exports=mongoose.model("ConversationLabel",schema);
