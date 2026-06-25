const Notification = require("../models/Notification");

const createNotification = async (
    userId,
    type,
    title,
    message
) => {

    return await Notification.create({
        user:userId,
        type,
        title,
        message
    });

};

module.exports = {
    createNotification
};