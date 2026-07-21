import { useCallback, useEffect, useMemo, useState } from "react";
import { conversationOrganizationService } from "../services/conversationOrganization.service";

function normalizeId(value) {
  return String(value?._id || value?.id || value || "");
}

function currentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return String(user._id || user.id || "");
  } catch {
    return "";
  }
}

export default function useConversationOrganization({
  conversations = [],
  setConversations,
  socket
}) {
  const [summary, setSummary] = useState(null);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const userId = useMemo(() => currentUserId(), []);

  const updateConversation = useCallback(
    (conversationId, updater) => {
      setConversations?.((current) =>
        current.map((conversation) =>
          normalizeId(conversation) === String(conversationId)
            ? updater(conversation)
            : conversation
        )
      );
    },
    [setConversations]
  );

  const refreshSummary = useCallback(async () => {
    const data = await conversationOrganizationService.getSummary();
    setSummary(data.summary);
    return data.summary;
  }, []);

  const refreshLabels = useCallback(async () => {
    const data = await conversationOrganizationService.getLabels();
    setLabels(data.labels || []);
    return data.labels || [];
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([refreshSummary(), refreshLabels()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [refreshLabels, refreshSummary]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const toggleFavorite = useCallback(
    async (conversation) => {
      const conversationId = normalizeId(conversation);
      const currentlyFavorite = (conversation.favoriteBy || []).some(
        (item) => normalizeId(item) === userId
      );

      const data =
        await conversationOrganizationService.toggleFavorite(
          conversationId,
          !currentlyFavorite
        );

      updateConversation(conversationId, (item) => {
        const favoriteBy = (item.favoriteBy || []).filter(
          (entry) => normalizeId(entry) !== userId
        );

        if (data.favorite) {
          favoriteBy.push(userId);
        }

        return {
          ...item,
          favoriteBy
        };
      });

      await refreshSummary();
      return data;
    },
    [refreshSummary, updateConversation, userId]
  );

  const togglePinned = useCallback(
    async (conversation) => {
      const conversationId = normalizeId(conversation);
      const pin = (conversation.pinnedBy || []).find(
        (item) => normalizeId(item.user) === userId
      );

      const data = pin
        ? await conversationOrganizationService.unpinConversation(
            conversationId
          )
        : await conversationOrganizationService.pinConversation(
            conversationId
          );

      updateConversation(conversationId, (item) => {
        const pinnedBy = (item.pinnedBy || []).filter(
          (entry) => normalizeId(entry.user) !== userId
        );

        if (data.pinned) {
          pinnedBy.push({
            user: userId,
            order: data.order || 1,
            pinnedAt: new Date().toISOString()
          });
        }

        return {
          ...item,
          pinnedBy
        };
      });

      await refreshSummary();
      return data;
    },
    [refreshSummary, updateConversation, userId]
  );

  const archiveConversation = useCallback(
    async (conversationId) => {
      const data =
        await conversationOrganizationService.archiveConversation(
          conversationId
        );

      updateConversation(conversationId, (item) => ({
        ...item,
        archivedBy: Array.from(
          new Set([...(item.archivedBy || []).map(normalizeId), userId])
        )
      }));

      await refreshSummary();
      return data;
    },
    [refreshSummary, updateConversation, userId]
  );

  const restoreConversation = useCallback(
    async (conversationId) => {
      const data =
        await conversationOrganizationService.restoreConversation(
          conversationId
        );

      updateConversation(conversationId, (item) => ({
        ...item,
        archivedBy: (item.archivedBy || []).filter(
          (entry) => normalizeId(entry) !== userId
        )
      }));

      await refreshSummary();
      return data;
    },
    [refreshSummary, updateConversation, userId]
  );

  const reorderPinned = useCallback(
    async (conversationIds) => {
      await conversationOrganizationService.reorderPinned(
        conversationIds
      );

      setConversations?.((current) =>
        current.map((conversation) => {
          const index = conversationIds.indexOf(
            normalizeId(conversation)
          );

          if (index < 0) return conversation;

          const pinnedBy = (conversation.pinnedBy || []).filter(
            (entry) => normalizeId(entry.user) !== userId
          );

          pinnedBy.push({
            user: userId,
            order: index + 1,
            pinnedAt: new Date().toISOString()
          });

          return {
            ...conversation,
            pinnedBy
          };
        })
      );
    },
    [setConversations, userId]
  );

  const assignLabel = useCallback(
    async (conversationId, labelId) => {
      const data =
        await conversationOrganizationService.assignLabel(
          conversationId,
          labelId
        );

      updateConversation(conversationId, (item) => ({
        ...item,
        labels: [
          ...(item.labels || []).filter(
            (entry) =>
              !(
                normalizeId(entry.label) === String(labelId) &&
                normalizeId(entry.assignedBy) === userId
              )
          ),
          {
            label: data.label,
            assignedBy: userId,
            assignedAt: new Date().toISOString()
          }
        ]
      }));

      return data;
    },
    [updateConversation, userId]
  );

  const removeLabel = useCallback(
    async (conversationId, labelId) => {
      const data =
        await conversationOrganizationService.removeLabel(
          conversationId,
          labelId
        );

      updateConversation(conversationId, (item) => ({
        ...item,
        labels: (item.labels || []).filter(
          (entry) =>
            !(
              normalizeId(entry.label) === String(labelId) &&
              normalizeId(entry.assignedBy) === userId
            )
        )
      }));

      return data;
    },
    [updateConversation, userId]
  );

  const createLabel = useCallback(
    async (payload) => {
      const data =
        await conversationOrganizationService.createLabel(payload);

      setLabels((current) => [...current, data.label]);
      return data.label;
    },
    []
  );

  const deleteLabel = useCallback(async (labelId) => {
    await conversationOrganizationService.deleteLabel(labelId);
    setLabels((current) =>
      current.filter((label) => normalizeId(label) !== String(labelId))
    );
  }, []);

  const updateCategory = useCallback(
    async (conversationId, payload) => {
      const data =
        await conversationOrganizationService.updateCategory(
          conversationId,
          payload
        );

      updateConversation(conversationId, (item) => ({
        ...item,
        category: data.category,
        priority: data.priority
      }));

      await refreshSummary();
      return data;
    },
    [refreshSummary, updateConversation]
  );

  useEffect(() => {
    if (!socket) return undefined;

    const onFavorite = (payload) => {
      updateConversation(payload.conversationId, (item) => {
        const favoriteBy = (item.favoriteBy || []).filter(
          (entry) => normalizeId(entry) !== String(payload.userId)
        );

        if (payload.favorite) {
          favoriteBy.push(payload.userId);
        }

        return { ...item, favoriteBy };
      });
    };

    const onPin = (payload) => {
      updateConversation(payload.conversationId, (item) => {
        const pinnedBy = (item.pinnedBy || []).filter(
          (entry) => normalizeId(entry.user) !== String(payload.userId)
        );

        if (payload.pinned) {
          pinnedBy.push({
            user: payload.userId,
            order: payload.order || 1,
            pinnedAt: new Date().toISOString()
          });
        }

        return { ...item, pinnedBy };
      });
    };

    const onArchive = (payload) => {
      updateConversation(payload.conversationId, (item) => ({
        ...item,
        archivedBy: Array.from(
          new Set([
            ...(item.archivedBy || []).map(normalizeId),
            payload.userId
          ])
        )
      }));
    };

    const onRestore = (payload) => {
      updateConversation(payload.conversationId, (item) => ({
        ...item,
        archivedBy: (item.archivedBy || []).filter(
          (entry) => normalizeId(entry) !== String(payload.userId)
        )
      }));
    };

    const onCategory = (payload) => {
      updateConversation(payload.conversationId, (item) => ({
        ...item,
        category: payload.category,
        priority: payload.priority
      }));
    };

    socket.on("conversation:favorite", onFavorite);
    socket.on("conversation:pin", onPin);
    socket.on("conversation:archive", onArchive);
    socket.on("conversation:restore", onRestore);
    socket.on("conversation:category", onCategory);

    return () => {
      socket.off("conversation:favorite", onFavorite);
      socket.off("conversation:pin", onPin);
      socket.off("conversation:archive", onArchive);
      socket.off("conversation:restore", onRestore);
      socket.off("conversation:category", onCategory);
    };
  }, [socket, updateConversation]);

  return {
    loading,
    error,
    summary,
    labels,
    userId,
    refreshSummary,
    refreshLabels,
    toggleFavorite,
    togglePinned,
    reorderPinned,
    archiveConversation,
    restoreConversation,
    assignLabel,
    removeLabel,
    createLabel,
    deleteLabel,
    updateCategory
  };
}
