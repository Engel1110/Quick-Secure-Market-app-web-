const service = require("../../services/messages/messageSearch.service");

function userId(req) { return req.user?._id || req.user?.id || req.userId; }
function fail(res, error) {
  return res.status(error.statusCode || 500).json({ success: false, message: error.message || "No se pudo completar la búsqueda." });
}

exports.searchMessages = async (req, res) => {
  try { return res.json({ success: true, ...(await service.searchMessages({ userId: userId(req), query: req.query })) }); }
  catch (error) { return fail(res, error); }
};

exports.searchConversations = async (req, res) => {
  try { return res.json({ success: true, ...(await service.searchConversations({ userId: userId(req), query: req.query })) }); }
  catch (error) { return fail(res, error); }
};
