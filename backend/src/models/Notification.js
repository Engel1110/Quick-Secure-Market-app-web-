const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
{
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    type:{
        type:String,
        enum:[
            "NEW_MESSAGE",
            "PRODUCT_SOLD",
            "ORDER_SHIPPED",
            "ORDER_DELIVERED",
            "DISPUTE_OPENED",
            "DISPUTE_RESOLVED",
            "KYC_APPROVED",
            "KYC_REJECTED",
            "FACE_CHECK_REQUIRED",
            "NEW_DEVICE",
            "SECURITY_ALERT",
            "PAYMENT_RELEASED"
        ],
        required:true
    },

    title:{
        type:String,
        required:true
    },

    message:{
        type:String,
        required:true
    },

    isRead:{
        type:Boolean,
        default:false
    }

},
{
    timestamps:true
});

module.exports = mongoose.model("Notification", notificationSchema);