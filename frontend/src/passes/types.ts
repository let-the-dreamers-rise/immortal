// The passes (關): scrolls that open on days of practice, and practice names
// given by generation. See backend/cultivation.py for why they exist.

export type PracticeName = {
  name: string;
  romanized: string;
  gloss: string;
  generation: number;
  generation_label: string;
  generation_character: string;
  seat: number;
  generation_size: number;
  taken_at: string;
};

export type PassMeta = {
  key: string;
  day: number;
  glyph: string;
  title: string;
  subtitle: string;
  sealed: boolean;
};

export type PassState = PassMeta & {
  opened: boolean;
  days_left: number;
  fingerprint?: string | null;
};

export type NextPass = PassMeta & { days_left: number };

export type Generation = {
  generation: number;
  label: string;
  character: string;
  pinyin: string;
  gloss: string;
  seat: number;
  size: number;
  remaining: number;
};

export type Vow = {
  key: string;
  title: string;
  day: number;
  taken_at: string;
  days_left: number;
  fulfilled: boolean;
};

export type NameCharacter = { character: string; pinyin: string; gloss: string };

export type PassesOverview = {
  days: number;
  passes: PassState[];
  next: NextPass | null;
  name: PracticeName | null;
  vow: Vow | null;
  open_generation: Generation;
  name_characters: NameCharacter[];
  vows: PassMeta[];
};

export type Scroll = PassMeta & {
  zh: string;
  translation: string;
  body: string[] | null;
  source?: string;
  fingerprint?: string | null;
  verified?: boolean;
  nonce?: string;
};

export type TodayPasses = {
  name: PracticeName | null;
  next: NextPass | null;
  opened_today: PassMeta | null;
  open_generation: Generation | null;
};
