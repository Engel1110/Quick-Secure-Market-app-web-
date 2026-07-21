import CategoryPriorityEditor from "./CategoryPriorityEditor";
import ConversationLabels from "./ConversationLabels";
import LabelSelector from "./LabelSelector";

export default function ConversationOrganizationPanel({
  conversation,
  userId,
  labels,
  onAssignLabel,
  onRemoveLabel,
  onCreateLabel,
  onUpdateCategory
}) {
  if (!conversation) {
    return (
      <aside className="qsm-organization-panel qsm-panel-empty">
        Selecciona una conversación.
      </aside>
    );
  }

  return (
    <aside className="qsm-organization-panel">
      <div className="qsm-panel-section">
        <small>Organización</small>
        <h3>Detalles inteligentes</h3>
      </div>

      <div className="qsm-panel-section">
        <h4>Etiquetas asignadas</h4>
        <ConversationLabels
          conversation={conversation}
          userId={userId}
        />
      </div>

      <div className="qsm-panel-section">
        <LabelSelector
          conversation={conversation}
          userId={userId}
          labels={labels}
          onAssign={onAssignLabel}
          onRemove={onRemoveLabel}
          onCreate={onCreateLabel}
        />
      </div>

      <div className="qsm-panel-section">
        <CategoryPriorityEditor
          conversation={conversation}
          onUpdate={onUpdateCategory}
        />
      </div>

      <div className="qsm-panel-section qsm-ai-note">
        <strong>Preparado para IA y Disputas</strong>
        <p>
          La prioridad y la categoría podrán cambiar automáticamente
          cuando el motor de seguridad detecte riesgo o se abra una
          disputa.
        </p>
      </div>
    </aside>
  );
}
