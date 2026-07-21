import { formatDateLabel } from "../../../utils/message.utils";

export default function DateSeparator({ value }) {
  return (
    <div className="qsm-date-separator" role="separator">
      <span>{formatDateLabel(value)}</span>
    </div>
  );
}