const {
  getUserRoom,
  getDisputeRoom
} = require("./socket");

/*
|--------------------------------------------------------------------------
| Obtener instancia de Socket.IO desde Express
|--------------------------------------------------------------------------
*/

const getIo = (req) => {
  if (!req?.app) {
    return null;
  }

  return req.app.get("io") || null;
};

/*
|--------------------------------------------------------------------------
| Emitir a una disputa
|--------------------------------------------------------------------------
*/

const emitToDispute = (
  req,
  disputeId,
  eventName,
  payload = {}
) => {
  try {
    const io = getIo(req);

    if (!io || !disputeId) {
      return false;
    }

    io.to(
      getDisputeRoom(disputeId)
    ).emit(eventName, {
      disputeId,
      ...payload
    });

    return true;
  } catch (error) {
    console.error(
      `Error emitting ${eventName} to dispute:`,
      error.message
    );

    return false;
  }
};

/*
|--------------------------------------------------------------------------
| Emitir a un usuario
|--------------------------------------------------------------------------
*/

const emitToUser = (
  req,
  userId,
  eventName,
  payload = {}
) => {
  try {
    const io = getIo(req);

    if (!io || !userId) {
      return false;
    }

    io.to(
      getUserRoom(userId)
    ).emit(eventName, payload);

    return true;
  } catch (error) {
    console.error(
      `Error emitting ${eventName} to user:`,
      error.message
    );

    return false;
  }
};

/*
|--------------------------------------------------------------------------
| Emitir al Back Office
|--------------------------------------------------------------------------
*/

const emitToBackoffice = (
  req,
  eventName,
  payload = {}
) => {
  try {
    const io = getIo(req);

    if (!io) {
      return false;
    }

    io.to(
      "admin-disputes"
    ).emit(eventName, payload);

    return true;
  } catch (error) {
    console.error(
      `Error emitting ${eventName} to Back Office:`,
      error.message
    );

    return false;
  }
};

/*
|--------------------------------------------------------------------------
| Nueva disputa
|--------------------------------------------------------------------------
*/

const emitDisputeCreated = (
  req,
  dispute
) => {
  const payload = {
    disputeId:
      dispute._id,
    disputeCode:
      dispute.disputeCode,
    order:
      dispute.order,
    product:
      dispute.product,
    buyer:
      dispute.buyer,
    seller:
      dispute.seller,
    status:
      dispute.status,
    priority:
      dispute.priority,
    protectedAmount:
      dispute.protectedAmount,
    createdAt:
      dispute.createdAt
  };

  emitToUser(
    req,
    dispute.buyer,
    "dispute:created",
    payload
  );

  emitToUser(
    req,
    dispute.seller,
    "dispute:created",
    payload
  );

  emitToBackoffice(
    req,
    "dispute:created",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Nuevo mensaje
|--------------------------------------------------------------------------
*/

const emitDisputeMessage = (
  req,
  dispute,
  message
) => {
  const payload = {
    disputeId:
      dispute._id,
    message,
    lastMessageAt:
      dispute.lastMessageAt,
    updatedAt:
      dispute.updatedAt
  };

  emitToDispute(
    req,
    dispute._id,
    "dispute:newMessage",
    payload
  );

  emitToUser(
    req,
    dispute.buyer,
    "dispute:newMessage",
    payload
  );

  emitToUser(
    req,
    dispute.seller,
    "dispute:newMessage",
    payload
  );

  emitToBackoffice(
    req,
    "dispute:newMessage",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Estado actualizado
|--------------------------------------------------------------------------
*/

const emitDisputeStatusChanged = (
  req,
  dispute,
  previousStatus
) => {
  const payload = {
    disputeId:
      dispute._id,
    disputeCode:
      dispute.disputeCode,
    previousStatus,
    status:
      dispute.status,
    updatedAt:
      dispute.updatedAt ||
      new Date()
  };

  emitToDispute(
    req,
    dispute._id,
    "dispute:statusChanged",
    payload
  );

  emitToUser(
    req,
    dispute.buyer,
    "dispute:statusChanged",
    payload
  );

  emitToUser(
    req,
    dispute.seller,
    "dispute:statusChanged",
    payload
  );

  emitToBackoffice(
    req,
    "dispute:statusChanged",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Disputa asignada
|--------------------------------------------------------------------------
*/

const emitDisputeAssigned = (
  req,
  dispute
) => {
  const payload = {
    disputeId:
      dispute._id,
    disputeCode:
      dispute.disputeCode,
    assignedAdmin:
      dispute.assignedAdmin,
    status:
      dispute.status,
    updatedAt:
      dispute.updatedAt ||
      new Date()
  };

  emitToDispute(
    req,
    dispute._id,
    "dispute:assigned",
    payload
  );

  emitToBackoffice(
    req,
    "dispute:assigned",
    payload
  );

  if (dispute.assignedAdmin) {
    emitToUser(
      req,
      dispute.assignedAdmin,
      "dispute:assigned",
      payload
    );
  }
};

/*
|--------------------------------------------------------------------------
| Evidencia agregada
|--------------------------------------------------------------------------
*/

const emitDisputeEvidenceAdded = (
  req,
  dispute,
  evidence
) => {
  const payload = {
    disputeId:
      dispute._id,
    evidence,
    updatedAt:
      dispute.updatedAt ||
      new Date()
  };

  emitToDispute(
    req,
    dispute._id,
    "dispute:newEvidence",
    payload
  );

  emitToUser(
    req,
    dispute.buyer,
    "dispute:newEvidence",
    payload
  );

  emitToUser(
    req,
    dispute.seller,
    "dispute:newEvidence",
    payload
  );

  emitToBackoffice(
    req,
    "dispute:newEvidence",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Disputa resuelta
|--------------------------------------------------------------------------
*/

const emitDisputeResolved = (
  req,
  dispute
) => {
  const payload = {
    disputeId:
      dispute._id,
    disputeCode:
      dispute.disputeCode,
    status:
      dispute.status,
    resolution:
      dispute.resolution,
    resolvedAt:
      dispute.resolvedAt,
    updatedAt:
      dispute.updatedAt ||
      new Date()
  };

  emitToDispute(
    req,
    dispute._id,
    "dispute:resolved",
    payload
  );

  emitToUser(
    req,
    dispute.buyer,
    "dispute:resolved",
    payload
  );

  emitToUser(
    req,
    dispute.seller,
    "dispute:resolved",
    payload
  );

  emitToBackoffice(
    req,
    "dispute:resolved",
    payload
  );
};

module.exports = {
  getIo,
  emitToDispute,
  emitToUser,
  emitToBackoffice,
  emitDisputeCreated,
  emitDisputeMessage,
  emitDisputeStatusChanged,
  emitDisputeAssigned,
  emitDisputeEvidenceAdded,
  emitDisputeResolved
};