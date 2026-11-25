interface CalendarDay {
  date: string;
  commits: number;
}

const intensity = ["bg-[#303238]", "bg-[#486954]", "bg-[#729d80]", "bg-[#b9dfc1]"];

export function StreakCalendar({ days }: { days: CalendarDay[] }) {
  return (
    <div>
      <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label="Scroll through the sync calendar">
        <ul aria-label="Synced commits by date" className="grid grid-flow-col grid-rows-7 auto-cols-max gap-1 w-max">
          {days.map(({ date, commits }) => {
            const shade = commits === 0 ? 0 : commits <= 2 ? 1 : commits <= 5 ? 2 : 3;
            const label = `${date} · ${commits} synced ${commits === 1 ? "commit" : "commits"}`;
            return (
              <li key={date} title={label} className={`w-3 h-3 rounded-sm ${intensity[shade]}`}>
                <span className="sr-only">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-subtle">
        <span>Less</span>
        {intensity.map(color => <span key={color} className={`w-3 h-3 rounded-sm ${color}`} />)}
        <span>More</span>
      </div>
    </div>
  );
}
