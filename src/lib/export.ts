import * as XLSX from 'xlsx';
import type { Criterion, RankedTeam, Team } from '@/types/shared';

export interface DivisionLite {
  id: string;
  name: string;
}

interface ExportRow {
  순위: number;
  본부: string;
  팀명: string;
  프로젝트명: string;
  총점가중: number;
  STDEV: string;
  제출자수: number;
  TF합의: string;
  [extra: string]: string | number;
}

function buildRows(
  ranked: RankedTeam[],
  criteria: Criterion[],
  teams: Team[],
  divisions: DivisionLite[],
): ExportRow[] {
  const teamMap = new Map(teams.map((t) => [t._id, t]));
  const divMap = new Map(divisions.map((d) => [d.id, d.name]));
  const ordered = [...criteria].sort((a, b) => a.order - b.order);

  return ranked.map((r, i) => {
    const team = teamMap.get(r.teamId);
    const row: ExportRow = {
      순위: i + 1,
      본부: divMap.get(r.divisionId) ?? r.divisionId,
      팀명: team?.name ?? r.teamId,
      프로젝트명: team?.projectName ?? '',
      총점가중: Math.round(r.totalAvg * 100) / 100,
      STDEV: r.stddev == null ? 'n<3' : (Math.round(r.stddev * 1000) / 1000).toString(),
      제출자수: r.submittedJudgeCount,
      TF합의: r.needsTfDecision ? 'Y' : '',
    };
    for (const c of ordered) {
      const v = r.perCriterionAvg[c._id];
      row[`${c.name}(raw)`] = v == null ? '-' : Math.round(v * 100) / 100;
    }
    return row;
  });
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function exportRankedCSV(
  ranked: RankedTeam[],
  criteria: Criterion[],
  teams: Team[],
  divisions: DivisionLite[],
  filename = `nova-rank-${timestamp()}.csv`,
): void {
  const rows = buildRows(ranked, criteria, teams, divisions);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

export function exportRankedXLSX(
  ranked: RankedTeam[],
  criteria: Criterion[],
  teams: Team[],
  divisions: DivisionLite[],
  filename = `nova-rank-${timestamp()}.xlsx`,
): void {
  const rows = buildRows(ranked, criteria, teams, divisions);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '최종 순위');
  XLSX.writeFile(wb, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
