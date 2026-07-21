import { useMemo, useState } from "react";

function normalizeId(value) {
  return String(
    value?._id ||
      value?.id ||
      value?.userId ||
      value ||
      ""
  );
}

function getUnreadCount(conversation, userId) {
  const unread = conversation?.unread;

  if (!unread) {
    return Number(conversation?.unreadCount || 0);
  }

  if (typeof unread.get === "function") {
    return Number(
      unread.get(String(userId)) || 0
    );
  }

  return Number(
    unread?.[String(userId)] || 0
  );
}

function getPinnedEntry(conversation, userId) {
  return (conversation?.pinnedBy || []).find(
    (item) =>
      normalizeId(item?.user || item) ===
      String(userId)
  );
}

export default function useConversationFilters({
  conversations = [],
  userId
}) {
  const [activeFilter, setActiveFilter] =
    useState("ALL");

  const [searchText, setSearchText] =
    useState("");

  const filteredConversations = useMemo(() => {
    const term = String(searchText || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return conversations
      .filter((conversation) => {
        const isFavorite =
          (conversation.favoriteBy || []).some(
            (item) =>
              normalizeId(item) ===
              String(userId)
          );

        const isPinned = Boolean(
          getPinnedEntry(
            conversation,
            userId
          )
        );

        const isArchived =
          (conversation.archivedBy || []).some(
            (item) =>
              normalizeId(item) ===
              String(userId)
          );

        const isUnread =
          getUnreadCount(
            conversation,
            userId
          ) > 0;

        const isHighRisk = [
          "HIGH",
          "CRITICAL"
        ].includes(
          conversation.priority
        );

        switch (activeFilter) {
          case "FAVORITES":
            return isFavorite;

          case "PINNED":
            return isPinned;

          case "ARCHIVED":
            return isArchived;

          case "UNREAD":
            return isUnread;

          case "HIGH_RISK":
            return isHighRisk;

          case "BUY":
          case "SELL":
          case "SUPPORT":
          case "DISPUTE":
            return (
              conversation.category ===
                activeFilter &&
              !isArchived
            );

          case "ALL":
          default:
            return !isArchived;
        }
      })
      .filter((conversation) => {
        if (!term) {
          return true;
        }

        const searchable = [
          conversation.title,
          conversation.name,
          conversation.lastMessage?.text,
          conversation.lastMessage?.content,
          conversation.product?.title,
          conversation.product?.name,
          conversation.order?.orderNumber,

          ...(conversation.participants || []).map(
            (participant) =>
              `${participant.firstName || ""} ${
                participant.lastName || ""
              } ${participant.name || ""} ${
                participant.email || ""
              }`
          )
        ]
          .join(" ")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        return searchable.includes(term);
      })
      .sort((a, b) => {
        const pinA = getPinnedEntry(
          a,
          userId
        );

        const pinB = getPinnedEntry(
          b,
          userId
        );

        if (pinA && pinB) {
          return (
            Number(pinA.order || 0) -
            Number(pinB.order || 0)
          );
        }

        if (pinA) {
          return -1;
        }

        if (pinB) {
          return 1;
        }

        return (
          new Date(
            b.updatedAt || 0
          ).getTime() -
          new Date(
            a.updatedAt || 0
          ).getTime()
        );
      });
  }, [
    activeFilter,
    conversations,
    searchText,
    userId
  ]);

  return {
    activeFilter,
    setActiveFilter,
    searchText,
    setSearchText,
    filteredConversations
  };
}