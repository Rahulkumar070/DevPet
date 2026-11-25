import s from "@/components/dashboard/workspace.module.css";

export default function DashboardLoading() {
  return <div className={s.loading} role="status"><span>Loading your workspace…</span></div>;
}
