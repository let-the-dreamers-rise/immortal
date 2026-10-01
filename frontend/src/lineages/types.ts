export type Person = { user_id: string; display_name: string | null; picture?: string | null };

export type Progress = {
  started_at: string;
  days_practised: number;
  days_since_start: number;
  percent: number;
  checked_in_today: boolean;
};

export type Lineage = {
  lineage_id: string;
  author_id: string;
  author: Person;
  title: string;
  chinese: string;
  summary: string;
  method: string;
  cautions: string;
  horizon_days: number;
  daily_minutes: number;
  based_on_practice_id: string | null;
  parent_id: string | null;
  created_at: string;
  practitioners: number;
  note_count: number;
  branch_count: number;
  my_progress: Progress | null;
  is_author: boolean;
};

export type LineageNote = {
  note_id: string;
  kind: "observation" | "adjustment" | "caution" | "question";
  body: string;
  day: number | null;
  created_at: string;
  author: Person;
  user_id: string;
  /** Written by whoever recorded the lineage: the closest thing it has to a teacher. */
  from_author?: boolean;
};

export type LineagePreview = {
  lineage_id: string;
  title: string;
  chinese: string;
  summary: string;
  horizon_days: number;
  daily_minutes: number;
  author_name: string | null;
  practitioners: number;
  carried_recently: number;
};

export type LineageActivity = {
  lineage_id: string;
  title: string;
  chinese: string;
  carried_recently: number;
  recent_names: string[];
  new_notes: number;
  latest_note: {
    author: string | null;
    from_author: boolean;
    kind: LineageNote["kind"];
    body: string;
    created_at: string;
  } | null;
  checked_in_today: boolean;
};

export type Carrier = Person & Progress;

export type LineageDetail = {
  lineage: Lineage & {
    parent: { lineage_id: string; title: string; chinese?: string } | null;
    practice: { practice_id: string; title: string } | null;
  };
  branches: Lineage[];
  notes: LineageNote[];
  carriers: Carrier[];
};

export function horizonLabel(days: number): string {
  if (days >= 365) {
    const years = Math.round((days / 365) * 10) / 10;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  if (days >= 60) return `${Math.round(days / 30)} months`;
  return `${days} days`;
}

export const NOTE_KINDS: { key: LineageNote["kind"]; label: string }[] = [
  { key: "observation", label: "Observation" },
  { key: "adjustment", label: "Adjustment" },
  { key: "caution", label: "Caution" },
  { key: "question", label: "Question" },
];
