import { useMemo, useState } from "react";

function normalizeId(value) {
  return String(value?._id || value?.id || value || "");
}

export default function LabelSelector({
  conversation,
  userId,
  labels,
  onAssign,
  onRemove,
  onCreate
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6");

  const selectedIds = useMemo(
    () =>
      new Set(
        (conversation.labels || [])
          .filter(
            (item) =>
              normalizeId(item.assignedBy) === String(userId)
          )
          .map((item) => normalizeId(item.label))
      ),
    [conversation.labels, userId]
  );

  async function submit(event) {
    event.preventDefault();

    if (!name.trim()) return;

    const label = await onCreate({
      name: name.trim(),
      color
    });

    await onAssign(conversation._id, label._id);
    setName("");
  }

  return (
    <div className="qsm-label-selector">
      <h4>Etiquetas</h4>

      <div className="qsm-label-selector-grid">
        {labels.map((label) => {
          const selected = selectedIds.has(normalizeId(label));

          return (
            <button
              type="button"
              key={normalizeId(label)}
              className={selected ? "is-selected" : ""}
              style={{ "--label-color": label.color || "#8b5cf6" }}
              onClick={() =>
                selected
                  ? onRemove(conversation._id, normalizeId(label))
                  : onAssign(conversation._id, normalizeId(label))
              }
            >
              <span />
              {label.name}
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} className="qsm-label-create">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nueva etiqueta"
          maxLength={40}
        />

        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label="Color de etiqueta"
        />

        <button type="submit">Crear</button>
      </form>
    </div>
  );
}
