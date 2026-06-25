const Notification = require("../models/Notification");

const getMyNotifications = async (req,res)=>{

try{

const notifications = await Notification.find({
    user:req.user.id
})
.sort({
    createdAt:-1
});

return res.json({
    count:notifications.length,
    notifications
});

}
catch(error){

console.error(error);

return res.status(500).json({
    message:"Error obteniendo notificaciones"
});

}

};


const markAsRead = async (req,res)=>{

try{

const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    {
        isRead:true
    },
    {
        new:true
    }
);

return res.json({
    message:"Notificación marcada como leída",
    notification
});

}
catch(error){

console.error(error);

return res.status(500).json({
    message:"Error actualizando notificación"
});

}

};


module.exports = {
    getMyNotifications,
    markAsRead
};