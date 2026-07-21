// backend/src/controllers/messages/message.controller.js

const messageService = require(
  "../../services/messages/message.service"
);

const {
  getUserId,
  sendError
} = require(
  "../../utils/messages/messageController.utils"
);

/*
|--------------------------------------------------------------------------
| Obtener conversaciones
|--------------------------------------------------------------------------
*/

const getConversations = async (
  req,
  res
) => {
  try {
    const conversations =
      await messageService.getConversations({
        userId: getUserId(req)
      });

    return res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Error cargando conversaciones"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Crear conversación
|--------------------------------------------------------------------------
*/

const createConversation = async (
  req,
  res
) => {
  try {
    const {
      receiverId,
      productId,
      orderId
    } = req.body;

    const conversation =
      await messageService.createConversation({
        userId: getUserId(req),
        receiverId,
        productId,
        orderId
      });

    return res.status(201).json({
      success: true,
      conversation
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Error creando conversación"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Obtener mensajes de una conversación
|--------------------------------------------------------------------------
*/

const getConversationMessages = async (
  req,
  res
) => {
  try {
    const messages =
      await messageService.getConversationMessages({
        userId: getUserId(req),
        conversationId:
          req.params.conversationId
      });

    return res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Error cargando mensajes"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Marcar conversación como leída
|--------------------------------------------------------------------------
*/

const markConversationAsRead = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.markConversationAsRead({
        io: req.app.get("io"),
        userId: getUserId(req),
        conversationId:
          req.params.conversationId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error marcando mensajes como leídos"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Enviar mensaje
|--------------------------------------------------------------------------
*/

const sendMessage = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.sendMessage({
        io: req.app.get("io"),
        userId: getUserId(req),
        body: req.body
      });

    return res.status(201).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error enviando mensaje"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Editar mensaje
|--------------------------------------------------------------------------
*/

const editMessage = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.editMessage({
        io: req.app.get("io"),
        userId: getUserId(req),
        messageId:
          req.params.messageId,
        body: req.body
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error editando mensaje"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Eliminar mensaje
|--------------------------------------------------------------------------
*/

const deleteMessage = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.deleteMessage({
        io: req.app.get("io"),
        userId: getUserId(req),
        messageId:
          req.params.messageId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error eliminando mensaje"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Silenciar conversación
|--------------------------------------------------------------------------
*/

const muteConversation = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.muteConversation({
        userId: getUserId(req),
        conversationId:
          req.params.conversationId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error silenciando conversación"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Archivar conversación
|--------------------------------------------------------------------------
*/

const archiveConversation = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.archiveConversation({
        userId: getUserId(req),
        conversationId:
          req.params.conversationId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error archivando conversación"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Bloquear conversación
|--------------------------------------------------------------------------
*/

const blockConversation = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.blockConversation({
        userId: getUserId(req),
        conversationId:
          req.params.conversationId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error bloqueando conversación"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Marcar conversación como favorita
|--------------------------------------------------------------------------
*/

const favoriteConversation = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.favoriteConversation({
        userId: getUserId(req),
        conversationId:
          req.params.conversationId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error actualizando favorito"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Agregar etiqueta
|--------------------------------------------------------------------------
*/

const addConversationLabel = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.addConversationLabel({
        userId: getUserId(req),
        conversationId:
          req.params.conversationId,
        body: req.body
      });

    return res.status(201).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error agregando etiqueta"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Fijar mensaje
|--------------------------------------------------------------------------
*/

const pinMessage = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.pinMessage({
        userId: getUserId(req),
        messageId:
          req.params.messageId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error fijando mensaje"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Buscar mensajes
|--------------------------------------------------------------------------
*/

const searchMessages = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.searchMessages({
        userId: getUserId(req),
        query: req.query.q,
        conversationId:
          req.query.conversationId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error buscando mensajes"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Exportar conversación
|--------------------------------------------------------------------------
*/

const exportConversation = async (
  req,
  res
) => {
  try {
    const result =
      await messageService.exportConversation({
        userId: getUserId(req),
        conversationId:
          req.params.conversationId
      });

    return res.status(200).json(
      result
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Error exportando conversación"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Exportaciones
|--------------------------------------------------------------------------
*/

module.exports = {
  getConversations,
  createConversation,
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
  editMessage,
  deleteMessage,
  muteConversation,
  archiveConversation,
  blockConversation,
  favoriteConversation,
  addConversationLabel,
  pinMessage,
  searchMessages,
  exportConversation
};