// Report and block, on everything another member wrote.
//
// Google Play requires both for any app where members read each other's
// posts. It is a small "more" button that opens a sheet: report this (with a
// reason), or block the person. Three members reporting the same thing hides
// it until a moderator looks; blocking hides both people from each other.
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { DotsThree } from "phosphor-react-native";

import { Button, Txt } from "@/src/components/ui";
import { apiFetch, errorMessage } from "@/src/api/client";
import { confirmAction, notify } from "@/src/utils/feedback";
import { colors, fonts, radius, spacing } from "@/src/theme";

export type ReportKind = "log" | "comment" | "lineage" | "note" | "meetup" | "user";

const REASONS: { key: string; label: string }[] = [
  { key: "dangerous_advice", label: "Unsafe practice advice" },
  { key: "harassment", label: "Harassment or bullying" },
  { key: "hate", label: "Hateful content" },
  { key: "sexual", label: "Sexual content" },
  { key: "violence", label: "Violence or threats" },
  { key: "self_harm", label: "Someone may be at risk of self-harm" },
  { key: "misinformation", label: "False health claims" },
  { key: "spam", label: "Spam or selling" },
  { key: "other", label: "Something else" },
];

const NOUN: Record<ReportKind, string> = {
  log: "reflection",
  comment: "reply",
  lineage: "lineage",
  note: "note",
  meetup: "circle",
  user: "profile",
};

type Props = {
  kind: ReportKind;
  targetId: string;
  authorId?: string;
  authorName?: string | null;
  /** Called after a block so the screen can drop the person's content. */
  onBlocked?: () => void;
  color?: string;
  testID?: string;
};

export function MoreMenu({ kind, targetId, authorId, authorName, onBlocked, color, testID }: Props) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setReporting(false);
    setReason(null);
    setDetails("");
  };

  const submitReport = async () => {
    if (!reason || busy) return;
    setBusy(true);
    try {
      await apiFetch("/reports", { method: "POST", body: { kind, target_id: targetId, reason, details } });
      close();
      notify("Thank you", "We will look at this. If a few people report the same thing, it is hidden right away.");
    } catch (e) {
      notify("Could not send the report", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    if (!authorId) return;
    const name = authorName || "this person";
    setOpen(false);
    const ok = await confirmAction(
      `Block ${name}?`,
      "You will stop seeing each other's reflections, replies, notes, circles and profiles. They are not told.",
      "Block",
      true
    );
    if (!ok) return;
    try {
      await apiFetch(`/blocks/${authorId}`, { method: "POST" });
      onBlocked?.();
    } catch (e) {
      notify("Could not block", errorMessage(e));
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityLabel="More options"
        testID={testID || `more-${kind}-${targetId}`}
      >
        <DotsThree size={22} color={color || colors.muted} weight="bold" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {!reporting ? (
              <>
                <Row label={`Report this ${NOUN[kind]}`} onPress={() => setReporting(true)} testID="more-report" />
                {authorId ? (
                  <Row label={`Block ${authorName || "this person"}`} onPress={block} danger testID="more-block" />
                ) : null}
                <Row label="Cancel" onPress={close} muted />
              </>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
                <Txt variant="title" style={{ marginBottom: spacing.xs }}>What is wrong with it?</Txt>
                <Txt variant="caption" style={{ marginBottom: spacing.md }}>
                  Reports are private. The person is not told who sent one.
                </Txt>
                {REASONS.map((r) => (
                  <Pressable
                    key={r.key}
                    onPress={() => setReason(r.key)}
                    style={[styles.reason, reason === r.key && styles.reasonActive]}
                    testID={`report-reason-${r.key}`}
                  >
                    <Txt variant="bodySm" color={reason === r.key ? colors.onSurface : colors.onSurfaceSecondary}>
                      {r.label}
                    </Txt>
                  </Pressable>
                ))}
                {reason === "self_harm" ? (
                  <Txt variant="caption" color={colors.error} style={{ marginTop: spacing.sm }}>
                    If someone is in immediate danger, contact local emergency services. In India you can call
                    Tele-MANAS on 14416, free and open all day.
                  </Txt>
                ) : null}
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Anything we should know (optional)"
                  placeholderTextColor={colors.muted}
                  multiline
                  maxLength={1000}
                  style={styles.details}
                  testID="report-details"
                />
                <Button
                  label="Send report"
                  onPress={submitReport}
                  disabled={!reason}
                  loading={busy}
                  style={{ marginTop: spacing.md }}
                  testID="report-submit"
                />
                <Row label="Cancel" onPress={close} muted />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Row({
  label,
  onPress,
  danger,
  muted,
  testID,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  muted?: boolean;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row} testID={testID}>
      <Txt variant="body" color={danger ? colors.error : muted ? colors.muted : colors.onSurface}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(26,25,24,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  row: { paddingVertical: spacing.md },
  reason: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  reasonActive: { borderColor: colors.brandPrimary, backgroundColor: colors.surfaceTertiary },
  details: {
    marginTop: spacing.md,
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    textAlignVertical: "top",
  },
});
