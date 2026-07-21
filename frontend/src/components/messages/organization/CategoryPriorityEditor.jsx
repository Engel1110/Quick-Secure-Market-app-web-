export default function CategoryPriorityEditor({
  conversation,
  onUpdate
}) {
  return (
    <div className="qsm-category-editor">
      <label>
        Categoría
        <select
          value={conversation.category || "GENERAL"}
          onChange={(event) =>
            onUpdate(conversation._id, {
              category: event.target.value
            })
          }
        >
          <option value="GENERAL">General</option>
          <option value="BUY">Compra</option>
          <option value="SELL">Venta</option>
          <option value="SUPPORT">Soporte</option>
          <option value="DISPUTE">Disputa</option>
        </select>
      </label>

      <label>
        Prioridad
        <select
          value={conversation.priority || "NORMAL"}
          onChange={(event) =>
            onUpdate(conversation._id, {
              priority: event.target.value
            })
          }
        >
          <option value="LOW">Baja</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
      </label>
    </div>
  );
}
