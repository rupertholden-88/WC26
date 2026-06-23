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
  isConfirmedQual,
  isThirdQual,
}: {
  team: GroupStanding["teams"][0];
  pos: number;
  isQual: boolean;
  isConfirmedQual?: boolean;
  isThirdQual?: boolean;
}) {
  return (
    <tr
      className="border-b border-[var(--border-dim)] last:border-0"
      style={isQual || isThirdQual ? { background: "var(--bg-qual)" } : undefined}
    >
      <td className="pl-3 pr-2 py-2.5 w-5">
        <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-faint)]">{pos}</span>
      </td>
      <td className="py-2.5 pr-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-medium ${isQual || isThirdQual ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
            {team.name}
          </span>
          {isConfirmedQual && (
            <span className="text-[8px] font-bold tracking-widest uppercase px-1 py-px rounded"
                  style={{ background: "var(--green-dark)", color: "var(--green)" }}>
              Q
            </span>
          )}
          {isThirdQual && (
            <span className="text-[8px] font-bold tracking-widest uppercase px-1 py-px rounded"
                  style={{ background: "var(--green-dark)", color: "var(--green)" }}>
              Q3
            </span>
          )}
        </div>
      </td>
      <td className="py-2.5 pr-2 text-center text-[12px] text-[var(--text-dim)]">{team.played}</td>
      <td className="py-2.5 pr-2 text-center text-[12px] text-[var(--text-dim)]">{team.gf}</td>
      <td className="py-2.5 pr-2 text-center text-[12px] text-[var(--text-dim)]">{team.ga}</td>
      <td className="py-2.5 pr-2 text-center text-[12px] text-[var(--text-dim)]">
        {team.gd > 0 ? `+${team.gd}` : team.gd}
      </td>
      <td className="py-2.5 pr-3 text-center">
        <span className="font-[family-name:var(--font-display)] text-[14px] font-bold text-[var(--accent)]">
          {team.pts}
        </span>
      </td>
    </tr>
  );
}

// Returns the set of team names that qualify as best 8 third-place finishers.
// Criteria (FIFA): pts → gd → gf → wins
function bestThirdPlace(data: GroupStanding[]): Set<string> {
  const thirds = data
    .map(g => g.teams[2])
    .filter(Boolean)
    .filter(t => t.played > 0);

  thirds.sort((a, b) =>
    b.pts - a.pts ||
    b.gd  - a.gd  ||
    b.gf  - a.gf  ||
    b.won - a.won
  );

  return new Set(thirds.slice(0, 8).map(t => t.name));
}

function GroupCard({ g, qualThirds }: { g: GroupStanding; qualThirds: Set<string> }) {
  const accent = GROUP_COLORS[g.group] ?? "#f5a623";
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--bg-muted)] transition-colors duration-200">
      {/* Group header */}
      <div className="flex items-center gap-2 bg-[var(--bg-mid)] px-3 py-2.5 border-b border-[var(--border)]">
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
          <tr className="border-b border-[var(--border-dim)]">
            <th className="w-5 pl-3" />
            <th className="py-1.5 text-left text-[9px] font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase pr-2">Team</th>
            <th className="py-1.5 text-center text-[9px] font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase pr-2">P</th>
            <th className="py-1.5 text-center text-[9px] font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase pr-2">GF</th>
            <th className="py-1.5 text-center text-[9px] font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase pr-2">GA</th>
            <th className="py-1.5 text-center text-[9px] font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase pr-2">GD</th>
            <th className="py-1.5 text-center text-[9px] font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase pr-3">Pts</th>
          </tr>
        </thead>
        <tbody>
          {(g.teams ?? []).map((t, i) => (
            <TeamRow
              key={i}
              team={t}
              pos={i + 1}
              isQual={i < 2}
              isConfirmedQual={i < 2 && t.played === 3}
              isThirdQual={i === 2 && qualThirds.has(t.name)}
            />
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

  const qualThirds = bestThirdPlace(data);
  const thirdsDone = data.filter(g => g.teams[2]?.played > 0).length;

  return (
    <div className="fadein">
      <SectionLabel>Group Stage Standings · {today}</SectionLabel>
      <p className="text-xs text-[var(--text-dim)] mb-5">
        Top 2 per group qualify automatically.{" "}
        {thirdsDone > 0
          ? <>Best 8 of 12 third-place teams also advance — <span className="text-[var(--green)] font-semibold">Q3</span> shows current qualifiers ({thirdsDone}/12 groups played).</>
          : <>8 best third-place teams also advance.</>
        }
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.map((g, i) => (
          <GroupCard key={i} g={g} qualThirds={qualThirds} />
        ))}
      </div>
    </div>
  );
}
