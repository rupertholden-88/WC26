"use client"; // v2

// TODO (c. 25 June 2026): Group stage ends ~28 June.
// Replace this StandingsTab with a knockout bracket view.
// Format: Round of 32 → Round of 16 → QF → SF → 3rd place play-off → Final
// football-data.org will return matches with stage = "LAST_32", "LAST_16", "QUARTER_FINALS" etc.
// Build a bracket component that reads those matches and fills in team names + scores as results come in.

import { GroupStanding } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: GroupStanding[] | null;
  loading: boolean;
  error: string | null;
}

const GROUP_COLORS: Record<string, string> = {
  A: "#f5a623", B: "#5baee0", C: "#e05b5b", D: "#8b5be0",
  E: "#3d9e68", F: "#e0b05b", G: "#5be0d0", H: "#e05bb0",
  I: "#a0e05b", J: "#e07a5b", K: "#5b8be0", L: "#c05be0",
};

function TeamRow({
  team,
  pos,
  isQual,
}: {
  team: GroupStanding["teams"][0];
  pos: number;
  isQual: boolean;
}) {
  return (
    <tr className={`border-b border-[#0d1624] last:border-0 ${isQual ? "bg-[#0f1d2e]/60" : ""}`}>
      <td className="pl-3 pr-2 py-2.5 w-5">
        <span className="font-[family-name:var(--font-display)] text-[11px] text-[#2a4060]">{pos}</span>
      </td>
      <td className="py-2.5 pr-2">
        <span className={`text-[13px] font-medium ${isQual ? "text-white" : "text-[#8aa8c8]"}`}>
          {team.name}
        </span>
      </td>
      <td className="py-2.5 pr-2 text-center text-[12px] text-[#4a6a8a]">{team.played}</td>
      <td className="py-2.5 pr-2 text-center text-[12px] text-[#4a6a8a]">
        {team.gd > 0 ? `+${team.gd}` : team.gd}
      </td>
      <td className="py-2.5 pr-3 text-center">
        <span className="font-[family-name:var(--font-display)] text-[14px] font-bold text-[#f5a623]">
          {team.pts}
        </span>
      </td>
    </tr>
  );
}

function GroupCard({ g }: { g: GroupStanding }) {
  const accent = GROUP_COLORS[g.group] ?? "#f5a623";
  return (
    <div className="bg-[#111e30] border border-[#1a2d45] rounded-xl overflow-hidden hover:border-[#1e3050] transition-colors duration-200">
      {/* Group header */}
      <div className="flex items-center gap-2 bg-[#0d1624] px-3 py-2.5 border-b border-[#1a2d45]">
        <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span
          className="font-[family-name:var(--font-display)] text-[12px] font-bold tracking-[0.15em] uppercase"
          style={{ color: accent }}
        >
          {`Group ${g.group.replace(/^group[_\s]*/i, "").trim()}`}
        </span>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#0d1624]">
            <th className="w-5 pl-3" />
            <th className="py-1.5 text-left text-[9px] font-semibold tracking-[0.18em] text-[#2a4060] uppercase pr-2">Team</th>
            <th className="py-1.5 text-center text-[9px] font-semibold tracking-[0.18em] text-[#2a4060] uppercase pr-2">P</th>
            <th className="py-1.5 text-center text-[9px] font-semibold tracking-[0.18em] text-[#2a4060] uppercase pr-2">GD</th>
            <th className="py-1.5 text-center text-[9px] font-semibold tracking-[0.18em] text-[#2a4060] uppercase pr-3">Pts</th>
          </tr>
        </thead>
        <tbody>
          {(g.teams ?? []).map((t, i) => (
            <TeamRow key={i} team={t} pos={i + 1} isQual={i < 2} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StandingsTab({ data, loading, error }: Props) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState message="Standings unavailable — try refreshing." />;

  return (
    <div className="fadein">
      <SectionLabel>Group Stage Standings · {today}</SectionLabel>
      <p className="text-xs text-[#4a6a8a] mb-5">
        Top 2 per group qualify automatically. 8 best third-place teams also advance.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.map((g, i) => (
          <GroupCard key={i} g={g} />
        ))}
      </div>
    </div>
  );
}
