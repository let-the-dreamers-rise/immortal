import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft, PaperPlaneRight, Trash } from "phosphor-react-native";

import { Avatar, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Author = { user_id: string; display_name: string; picture?: string | null };
type Log = { log_id: string; body: string; nothing_happened: boolean; created_at: string; author: Author; practice_titles: string[] };
type Comment = { comment_id: string; body: string; created_at: string; author: Author };

export default function LogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [log, setLog] = useState<Log | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<{ log: Log; comments: Comment[] }>(`/logs/${id}`);
    setLog(res.log);
    setComments(res.comments);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch<{ comment: Comment }>(`/logs/${id}/comments`, { method: "POST", body: { body: text.trim() } });
      setComments((c) => [...c, res.comment]);
      setText("");
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (cid: string) => {
    setComments((c) => c.filter((x) => x.comment_id !== cid));
    await apiFetch(`/comments/${cid}`, { method: "DELETE" }).catch(() => load());
  };

  if (!log) {
    return (
      <View style={styles.container}>
        <Loading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="log-detail-back">
          <CaretLeft size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Txt variant="label">Reflection</Txt>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.authorRow} onPress={() => router.push(`/user/${log.author.user_id}`)} testID="log-detail-author">
          <Avatar name={log.author.display_name} uri={log.author.picture} size={40} />
          <View style={{ marginLeft: spacing.md }}>
            <Txt variant="label">{log.author.display_name}</Txt>
            <Txt variant="caption">{new Date(log.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric" }).toUpperCase()}</Txt>
          </View>
        </Pressable>

        <Txt variant="body" style={{ marginTop: spacing.lg, fontSize: 17, lineHeight: 26 }}>
          {log.nothing_happened && !log.body ? "Nothing happened today — and that is part of it." : log.body}
        </Txt>
        {log.practice_titles.length > 0 ? (
          <Txt variant="caption" color={colors.brandPrimary} style={{ marginTop: spacing.md }}>{log.practice_titles.join(" · ")}</Txt>
        ) : null}

        <View style={styles.divider} />
        <Txt variant="caption" color={colors.brandPrimary} style={{ marginBottom: spacing.md }}>
          {comments.length === 0 ? "NO REPLIES YET" : `${comments.length} REPL${comments.length === 1 ? "Y" : "IES"}`}
        </Txt>

        {comments.length === 0 ? (
          <Txt variant="bodySm">Be the first to reply — “I tried this too, here’s what I noticed.”</Txt>
        ) : (
          comments.map((c) => (
            <View key={c.comment_id} style={styles.comment} testID={`comment-${c.comment_id}`}>
              <Avatar name={c.author.display_name} uri={c.author.picture} size={32} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Txt variant="label" style={{ fontSize: 13 }}>{c.author.display_name}</Txt>
                  {c.author.user_id === user?.user_id ? (
                    <Pressable onPress={() => removeComment(c.comment_id)} hitSlop={8} testID={`comment-delete-${c.comment_id}`}>
                      <Trash size={13} color={colors.muted} weight="regular" />
                    </Pressable>
                  ) : null}
                </View>
                <Txt variant="body" style={{ marginTop: 2 }}>{c.body}</Txt>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a reply…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            testID="comment-input"
          />
          <Pressable onPress={send} disabled={sending || !text.trim()} style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]} testID="comment-send">
            <PaperPlaneRight size={20} color={colors.onBrandPrimary} weight="fill" />
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  authorRow: { flexDirection: "row", alignItems: "center" },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xl },
  comment: { flexDirection: "row", marginBottom: spacing.lg },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
