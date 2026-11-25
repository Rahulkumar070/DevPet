import s from "./companion-card.module.css";

export function CompanionCardSkeleton() {
  return <div className={s.card} role="status" aria-label="Loading companion">
    <div className={s.skeletonScene} />
    <div className={s.body} aria-hidden="true">
      <div className={s.skeletonLine} /><div className={s.skeletonTitle} />
      <div className={s.skeletonStats} />
    </div>
  </div>;
}
