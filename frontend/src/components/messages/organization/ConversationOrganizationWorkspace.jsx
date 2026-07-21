import { useMemo } from "react";
import SmartConversationSidebar from "./SmartConversationSidebar";
import ConversationOrganizationPanel from "./ConversationOrganizationPanel";
import useConversationFilters from "../../../hooks/useConversationFilters";
import useConversationOrganization from "../../../hooks/useConversationOrganization";

export default function ConversationOrganizationWorkspace({
  conversations = [],
  setConversations,
  selectedConversation,
  setSelectedConversation,
  socket,
  children
}) {
  const organization = useConversationOrganization({
    conversations,
    setConversations,
    socket
  });

  const filters = useConversationFilters({
    conversations,
    userId: organization.userId
  });

  const currentConversation = useMemo(
    () =>
      conversations.find(
        (item) =>
          String(item?._id || "") ===
          String(selectedConversation?._id || "")
      ) ||
      selectedConversation ||
      null,
    [conversations, selectedConversation]
  );

  return (
    <div className="qsm-organization-workspace">
      <SmartConversationSidebar
        conversations={filters.filteredConversations}
        selectedConversationId={currentConversation?._id}
        onSelectConversation={setSelectedConversation}
        activeFilter={filters.activeFilter}
        onFilterChange={filters.setActiveFilter}
        searchText={filters.searchText}
        onSearchChange={filters.setSearchText}
        summary={organization.summary}
        userId={organization.userId}
        onFavorite={organization.toggleFavorite}
        onPin={organization.togglePinned}
        onArchive={organization.archiveConversation}
        onRestore={organization.restoreConversation}
      />

      <main className="qsm-message-content">
        {children}
      </main>

      <ConversationOrganizationPanel
        conversation={currentConversation}
        userId={organization.userId}
        labels={organization.labels}
        onAssignLabel={organization.assignLabel}
        onRemoveLabel={organization.removeLabel}
        onCreateLabel={organization.createLabel}
        onUpdateCategory={organization.updateCategory}
      />
    </div>
  );
}