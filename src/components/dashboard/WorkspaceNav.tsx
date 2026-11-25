"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ChartNoAxesColumn, ChevronRight, Egg, GitCommitHorizontal, LayoutDashboard, Menu, MessageCircle, PawPrint, Settings, Shield, Swords, X, Zap } from "lucide-react";
import s from "./workspace.module.css";

const groups = [
  { title: "Workspace", links: [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: ChartNoAxesColumn, label: "Analytics", href: "/analytics" },
    { icon: GitCommitHorizontal, label: "Activity", href: "/dashboard#activity" },
  ] },
  { title: "Companions", links: [
    { icon: Egg, label: "Hatchery", href: "/hatch" },
    { icon: MessageCircle, label: "Companion chat", href: "/chat" },
  ] },
  { title: "Community", links: [
    { icon: Swords, label: "Battle arena", href: "/battle" },
    { icon: Shield, label: "Guild", href: "/guild" },
  ] },
];

interface NavProps {
  level: number;
  percent: number;
  remaining: number;
  guildSlug?: string;
}

function NavContent({ level, percent, remaining, guildSlug, close }: NavProps & { close?: () => void }) {
  const pathname = usePathname();
  return <>
    <div className={s.brandRow}>
      <Link href="/dashboard" onClick={close} className={s.brand}>
        <span className={s.brandMark}><PawPrint size={21} strokeWidth={2.5} /></span>
        <span><strong>DevPet</strong><small>Personal workspace</small></span>
      </Link>
      {close && <button className={s.iconButton} onClick={close} aria-label="Close navigation"><X size={17} /></button>}
    </div>
    <nav className={s.nav} aria-label="Workspace navigation">
      {groups.map(group => <div key={group.title}>
        <p>{group.title}</p>
        {group.links.map(({ icon: Icon, label, href }) => (
          <Link key={href} href={href === "/guild" && guildSlug ? `/guild/${guildSlug}` : href}
            onClick={close} aria-current={(pathname === href || pathname.startsWith(href + "/")) ? "page" : undefined}>
            <Icon size={17} />{label}
          </Link>
        ))}
      </div>)}
    </nav>
    <div className={s.sideFooter}>
      <Link href="/settings" onClick={close} className={s.settings} aria-current={pathname === "/settings" ? "page" : undefined}><Settings size={17} />Settings</Link>
      <Link href="/analytics" onClick={close} className={s.levelCard}>
        <span><b><Zap size={14} /> Level {level}</b><ChevronRight size={14} /></span>
        <div className={s.meter}><i style={{ width: `${percent}%` }} /></div>
        <small>{level >= 50 ? "Maximum level reached" : `${remaining} XP to the next level`}</small>
      </Link>
    </div>
  </>;
}

export function WorkspaceNav(props: NavProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <aside className={s.sidebar}><NavContent {...props} /></aside>
    <button className={s.mobileMenu} aria-label="Open workspace navigation" onClick={() => dialog.current?.showModal()}><Menu size={18} /></button>
    <dialog ref={dialog} aria-label="Workspace navigation" className={s.drawer} onClick={e => {
      if (e.target === dialog.current && e.clientX >= e.currentTarget.getBoundingClientRect().right) dialog.current.close();
    }}>
      <NavContent {...props} close={() => dialog.current?.close()} />
    </dialog>
  </>;
}
