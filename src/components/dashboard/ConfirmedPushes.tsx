"use client";

import { useQuery } from "@tanstack/react-query";
import { timeAgo } from "@/lib/utils";
import s from "./workspace.module.css";

interface Receipt {
  _id: string;
  repository: string;
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  receivedAt: string;
}

interface Feed {
  configured: boolean;
  installUrl: string | null;
  pushes: Receipt[];
}

export function ConfirmedPushes({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: ["github", "pushes", userId],
    queryFn: async (): Promise<Feed> => {
      const response = await fetch("/api/github/pushes", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load confirmed pushes");
      return response.json();
    },
    refetchInterval: 30_000,
  });
  const feed = query.data;
  return <section className={s.activity} aria-labelledby="confirmed-pushes">
    <div className={s.activityHead}>
      <div className={s.sectionTitle}><h2 id="confirmed-pushes">Confirmed pushes</h2></div>
      {feed?.installUrl && <a href={feed.installUrl} className={s.sync}>Connect repositories</a>}
    </div>
    {query.isError ? <div className={s.empty} role="status">Couldn’t load push history. <button onClick={() => void query.refetch()}>Try again</button></div>
      : !feed ? <div className={s.empty} role="status">Loading confirmed pushes…</div>
      : !feed.pushes.length ? <div className={s.empty}>{feed.configured
        ? "Your next push to a repository connected to the DevPet GitHub App will appear here."
        : "To receive push confirmations, configure the GitHub App webhook for this DevPet server. Setup is in the project README."}</div>
      : <div className={s.tableScroll}><table className={s.table}>
        <thead><tr><th>Repository</th><th>Branch or tag</th><th>Change</th><th>Revision</th><th>Received</th></tr></thead>
        <tbody>{feed.pushes.map(push => <tr key={push._id}>
          <td>{push.repository}</td><td>{push.ref.replace(/^refs\/(heads|tags)\//, (_, kind) => kind === "tags" ? "Tag · " : "")}</td>
          <td>{push.deleted ? "Deleted" : push.created ? "Created" : push.forced ? "Force-pushed" : "Updated"}</td>
          <td><code title={push.deleted ? push.before : push.after}>{(push.deleted ? push.before : push.after).slice(0, 8)}</code></td>
          <td><time dateTime={push.receivedAt} title={new Date(push.receivedAt).toLocaleString()}>{timeAgo(push.receivedAt)}</time></td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
