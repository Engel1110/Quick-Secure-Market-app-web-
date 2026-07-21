/* Al abrir una disputa */
await Conversation.findByIdAndUpdate(conversationId,{$set:{category:"DISPUTE",priority:"HIGH","organizationAudit.lastCategoryUpdate":new Date()}});
/* Luego asigna la etiqueta del sistema slug=disputa. */
