export default function MessageSkeleton() {
  return (
    <div className="qsm-message-skeleton-list">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className={`qsm-message-skeleton ${
            index % 2 ? "is-mine" : "is-other"
          }`}
        >
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
