"use client";

import { useState } from "react";
import { ArrowDownWideNarrow, ChevronLeft, ChevronRight, GitCommitHorizontal, LayoutGrid, List } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import s from "./workspace.module.css";

export interface SyncedCommit {
  sha: string;
  repo: string;
  message: string;
  xpAwarded: number;
  createdAt: string;
}

function CommitTitle({ commit }: { commit: SyncedCommit }) {
  const title = commit.message.split("\n")[0] || commit.sha.slice(0, 7);
  return <a className={s.commitTitle} href={`https://github.com/${commit.repo.split("/").map(encodeURIComponent).join("/")}/commit/${encodeURIComponent(commit.sha)}`} target="_blank" rel="noreferrer">
    <span className={s.commitIcon}><GitCommitHorizontal size={17} /></span>
    <span><strong title={title}>{title}</strong><small>{commit.sha.slice(0, 7)}</small></span>
  </a>;
}

export function ActivityFeed({ commits, loading, error, retry }: {
  commits: SyncedCommit[]; loading: boolean; error: boolean; retry: () => void;
}) {
  const [cards, setCards] = useState(false);
  const [oldest, setOldest] = useState(false);
  const [page, setPage] = useState(0);
  const pages = Math.ceil(commits.length / 6);
  const current = Math.min(page, Math.max(pages - 1, 0));
  const ordered = oldest ? [...commits].reverse() : commits;
  const visible = ordered.slice(current * 6, current * 6 + 6);

  return <section id="activity" className={s.activity} aria-label="GitHub activity">
    <div className={s.activityHead}>
      <div className={s.sectionTitle}><h2>GitHub activity</h2><span>{loading ? "…" : commits.length}</span></div>
      <div className={s.viewTools}>
        <button className={s.sort} onClick={() => { setOldest(!oldest); setPage(0); }} aria-label={oldest ? "Sort newest first" : "Sort oldest first"} title={oldest ? "Oldest first" : "Newest first"}><ArrowDownWideNarrow size={14} className={oldest ? s.flipped : undefined} /></button>
        <div className={s.segment}>
          <button aria-pressed={!cards} onClick={() => setCards(false)}><List size={13} />Table</button>
          <button aria-pressed={cards} onClick={() => setCards(true)}><LayoutGrid size={12} />Cards</button>
        </div>
      </div>
    </div>
    {loading || error || !visible.length ? <div className={s.empty} role="status">{error
      ? <>Couldn’t load activity. <button onClick={retry}>Try again</button></>
      : loading ? "Loading GitHub activity…" : "No synced commits match this view."}</div>
    : cards ? <div className={s.commitCards}>{visible.map(c => <article key={c.sha}>
      <CommitTitle commit={c} /><p>{c.repo}</p><footer><span className={s.xp}>+{c.xpAwarded} XP</span><span>{timeAgo(c.createdAt)}</span></footer>
    </article>)}</div> : <div className={s.tableScroll}><table className={s.table}>
      <thead><tr><th>Commit</th><th>Repository</th><th>Status</th><th>XP earned</th><th>Synced</th></tr></thead>
      <tbody>{visible.map(c => <tr key={c.sha}>
        <td><CommitTitle commit={c} /></td><td><span className={s.repoTag} title={c.repo}>{c.repo.split("/").pop()}</span></td>
        <td><span className={s.status}><i />Synced</span></td><td><span className={s.xp}>+{c.xpAwarded} XP</span></td>
        <td><time dateTime={c.createdAt} title={new Date(c.createdAt).toLocaleString()}>{timeAgo(c.createdAt)}</time></td>
      </tr>)}</tbody>
    </table></div>}
    {!loading && !error && pages > 0 && <div className={s.pagination}>
      <span>{current * 6 + 1}–{Math.min((current + 1) * 6, commits.length)} of {commits.length} commits</span>
      {pages > 1 ? <div><button aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft size={14} /></button>
        <button aria-label="Next page" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}><ChevronRight size={14} /></button></div> : null}
    </div>}
  </section>;
}
