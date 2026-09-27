import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "phosphor-react-native";

import { Button, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { nth, shareName } from "@/src/passes/share";
import type { PassesOverview, PracticeName, Vow } from "@/src/passes/types";
import { colors, fonts, radius, spacing } from "@/src/theme";

// Taking a name. Daoist orders name disciples by generation: one character
// of a lineage verse shared by everyone in the generation, one chosen for the
// disciple. The first 108 names are the first generation, and the name is
// permanent, so the screen asks once and plainly.

type Step = "intro" | "character" | "vow" | "confirm" | "done";

const VOW_LINES: Record<string, string> = {
  "first-pass": "A hundred days to lay the foundation.",
  "middle-pass": "Ten months of gestation.",
  "upper-pass": "Nine years facing the wall.",
};

export default function VowScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refresh, loading: authLoading } = useAuth();
  const [data, setData] = useState<PassesOverview | null>(null);
  const [step, setStep] = useState<Step>("intro");
  const [character, setCharacter] = useState<string | null>(null);
  const [vow, setVow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState<PracticeName | null>(null);

  useEffect(() => {
    if (authLoading) return;
    apiFetch<PassesOverview>("/passes")
      .then((d) => {
        setData(d);
        // Someone who already has a name is here to vow again.
        if (d.name) setStep("vow");
      })
      .catch(() => setData(null));
  }, [authLoading]);

  if (!data) {
    return (
      <View style={styles.container}>
        <Loading />
      </View>
    );
  }

  const gen = data.open_generation;
  const renewing = Boolean(data.name);
  const chosen = data.name_characters.find((c) => c.character === character) ?? null;
  const preview = chosen
    ? {
        name: gen.character + chosen.character,
        romanized: `${gen.pinyin} ${chosen.pinyin}`,
        gloss: `${gen.gloss.charAt(0).toUpperCase()}${gen.gloss.slice(1)} ${chosen.gloss}`,
      }
    : null;
  const vowOptions = data.vows.filter((v) => v.day > data.days);
  const chosenVow = data.vows.find((v) => v.key === vow) ?? null;

  const takeName = async () => {
    if (!character || !vow) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ name: PracticeName }>("/passes/name", { method: "POST", body: { character, vow } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTaken(res.name);
      setStep("done");
      refresh().catch(() => {});
    } catch (e: any) {
      Alert.alert("Your name was not taken", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const renewVow = async () => {
    if (!vow) return;
    setBusy(true);
    try {
      await apiFetch<{ vow: Vow }>("/passes/vow", { method: "POST", body: { vow } });
      router.back();
    } catch (e: any) {
      Alert.alert("Your vow was not recorded", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="vow-close-button">
          <X size={22} color={colors.onSurface} />
        </Pressable>
        <Txt variant="label">{renewing ? "A new vow" : "Your name"}</Txt>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
        {step === "intro" ? (
          <View testID="vow-intro">
            <Txt style={[styles.big, { color: colors.cinnabar }]}>{gen.character}</Txt>
            <Txt variant="caption" center color={colors.cinnabar}>
              {gen.label.toUpperCase()} · {gen.gloss.toUpperCase()}
            </Txt>
            <Txt variant="body" style={styles.para}>
              Daoist orders name their disciples by generation. Everyone in a generation shares one character of a
              lineage verse, and each adds a character of their own. The Longmen order has named its disciples this way
              for centuries.
            </Txt>
            <Txt variant="body" style={styles.para}>
              Immortal keeps a verse of its own. The first 108 people to take a name are its first generation, and there
              will never be more than 108 of them. Each generation after is ten times larger.
            </Txt>
            <Txt variant="body" style={styles.para}>
              {gen.remaining.toLocaleString("en-US")} {gen.remaining === 1 ? "place remains" : "places remain"} in the{" "}
              {gen.label.toLowerCase()}. Where the verse comes from opens on your 59th day of practice.
            </Txt>
            <Txt variant="bodySm" color={colors.muted} style={styles.para}>
              {"This is a name within Immortal's own community. It is not an ordination in any Daoist order."}
            </Txt>
            <Button label="Choose your character" onPress={() => setStep("character")} style={{ marginTop: spacing.xl }} testID="vow-start" />
          </View>
        ) : null}

        {step === "character" ? (
          <View testID="vow-character">
            <Txt style={styles.big}>{preview?.name ?? `${gen.character}·`}</Txt>
            <Txt variant="subtitle" center>
              {preview ? preview.romanized : "Choose the second character"}
            </Txt>
            <Txt variant="bodySm" center color={colors.muted}>
              {preview ? preview.gloss : " "}
            </Txt>
            <View style={styles.grid}>
              {data.name_characters.map((c) => {
                const active = c.character === character;
                return (
                  <Pressable
                    key={c.character}
                    testID={`vow-char-${c.character}`}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setCharacter(c.character);
                    }}
                    style={[styles.tile, active && styles.tileActive]}
                  >
                    <Txt style={[styles.tileGlyph, active && { color: colors.onBrandPrimary }]}>{c.character}</Txt>
                    <Txt variant="caption" color={active ? colors.onBrandPrimary : colors.muted} numberOfLines={1}>
                      {c.gloss}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <Button label="Next" disabled={!character} onPress={() => setStep("vow")} style={{ marginTop: spacing.xl }} testID="vow-character-next" />
          </View>
        ) : null}

        {step === "vow" ? (
          <View testID="vow-choose">
            <Txt variant="title" center>
              {renewing ? "Which pass will you vow toward now?" : "Which pass do you vow to reach?"}
            </Txt>
            <Txt variant="bodySm" center style={{ marginTop: spacing.sm }}>
              Counted in days you practise. You can make a new vow later.
            </Txt>
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              {vowOptions.map((v) => {
                const active = v.key === vow;
                return (
                  <Pressable
                    key={v.key}
                    testID={`vow-option-${v.key}`}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setVow(v.key);
                    }}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Txt variant="caption" color={active ? colors.onBrandPrimary : colors.cinnabar}>
                      {v.day.toLocaleString("en-US")} DAYS OF PRACTICE
                    </Txt>
                    <Txt variant="title" color={active ? colors.onBrandPrimary : colors.onSurface} style={{ marginTop: 2 }}>
                      {v.title}
                    </Txt>
                    <Txt variant="bodySm" color={active ? colors.onBrandPrimary : colors.onSurfaceSecondary}>
                      {VOW_LINES[v.key] ?? v.subtitle}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={renewing ? "Make this vow" : "Next"}
              disabled={!vow}
              loading={busy}
              onPress={renewing ? renewVow : () => setStep("confirm")}
              style={{ marginTop: spacing.xl }}
              testID="vow-choose-next"
            />
          </View>
        ) : null}

        {step === "confirm" && preview && chosenVow ? (
          <View testID="vow-confirm">
            <Txt style={styles.big}>{preview.name}</Txt>
            <Txt variant="subtitle" center>
              {preview.romanized}
            </Txt>
            <Txt variant="bodySm" center color={colors.muted}>
              {preview.gloss}
            </Txt>
            <View style={styles.summary}>
              <Txt variant="bodySm">
                {gen.label}, {gen.character} ({gen.gloss}). Vowed to reach {chosenVow.title.replace(/^The /, "the ")}, after{" "}
                {chosenVow.day.toLocaleString("en-US")} days of practice.
              </Txt>
            </View>
            <Txt variant="bodySm" center style={{ marginTop: spacing.lg }}>
              Your name and your generation are permanent. Your vow can change later.
            </Txt>
            <Button label="Take my name" loading={busy} onPress={takeName} style={{ marginTop: spacing.xl }} testID="vow-confirm-button" />
            <Button label="Choose again" variant="ghost" onPress={() => setStep("character")} style={{ marginTop: spacing.md }} />
          </View>
        ) : null}

        {step === "done" && taken ? (
          <View testID="vow-done">
            <Txt style={[styles.big, { color: colors.cinnabar }]}>{taken.name}</Txt>
            <Txt variant="subtitle" center>
              {taken.romanized}
            </Txt>
            <Txt variant="bodySm" center color={colors.muted}>
              {taken.gloss}
            </Txt>
            <Txt variant="body" center style={styles.para}>
              You are the {nth(taken.seat)} of the {taken.generation_label.toLowerCase()}. That will always be true.
            </Txt>
            <Button label="Share my name" onPress={() => shareName(taken)} style={{ marginTop: spacing.xl }} testID="vow-share" />
            <Button label="See the passes" variant="ghost" onPress={() => router.replace("/passes")} style={{ marginTop: spacing.md }} testID="vow-see-passes" />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  big: { fontFamily: fonts.display, fontSize: 72, lineHeight: 88, color: colors.onSurface, textAlign: "center" },
  para: { marginTop: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl, justifyContent: "center" },
  tile: {
    width: 76,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  tileActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  tileGlyph: { fontFamily: fonts.display, fontSize: 28, lineHeight: 36, color: colors.onSurface },
  option: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  optionActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  summary: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
});
