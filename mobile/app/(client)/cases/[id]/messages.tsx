import { Audio } from "expo-av";
import { useLocalSearchParams } from "expo-router";
import { Mic, Play, Send, Square, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useCaseMessages,
  useSendMessage,
  useSendVoiceNote,
  voiceNoteUrl,
  type CaseMessage,
} from "@/lib/portal";
import { useAuthToken } from "@/lib/session";

function Bubble({ message, onPlay }: { message: CaseMessage; onPlay: () => void }) {
  const mine = message.authorType === "client";
  const time = new Date(message.createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View className={`max-w-[85%] gap-1.5 ${mine ? "self-end" : "self-start"}`}>
      <View
        className={`gap-2 rounded-card px-3.5 py-3 ${
          mine ? "bg-gold-wash" : "border border-rule bg-surface"
        }`}
      >
        {message.body ? (
          <Text className="text-sm leading-6 text-ink">{message.body}</Text>
        ) : null}

        {message.hasVoiceNote && (
          <Pressable
            onPress={onPlay}
            className="flex-row items-center gap-2 rounded-card bg-surface px-3 py-2 active:opacity-70"
          >
            <Play size={16} color="#9a7622" />
            <Text className="text-sm font-semibold text-gold">Play the recording</Text>
          </Pressable>
        )}
      </View>
      <Text className={`text-[11px] text-ink-soft ${mine ? "text-right" : ""}`}>
        {mine ? "You" : message.authorName || "The office"} · {time}
      </Text>
    </View>
  );
}

export default function CaseMessages() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = Number(id);
  const token = useAuthToken();

  const { data, isPending } = useCaseMessages(caseId);
  const sendText = useSendMessage(caseId);
  const sendVoice = useSendVoiceNote(caseId);

  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // A sound left loaded holds the audio session open; unload on the way out.
  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError("The microphone is not allowed. You can still type your question.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: started } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(started);
    } catch {
      setError("Could not start recording on this device.");
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      setRecordedUri(recording.getURI());
    } catch {
      setError("Could not finish the recording.");
    } finally {
      setRecording(null);
    }
  }

  async function play(messageId: number) {
    setError(null);
    try {
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        // The recording is behind the same auth as everything else. iOS and
        // Android carry these headers on the media request; the web target
        // cannot — an HTML audio element has no way to send them — so
        // playback there fails and is reported. That affects
        // `expo start --web` only, never a built app.
        { uri: voiceNoteUrl(messageId), headers: token ? { Authorization: `Bearer ${token}` } : {} },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch {
      setError("Could not play that recording.");
    }
  }

  async function send() {
    setError(null);
    try {
      if (recordedUri) {
        await sendVoice.mutateAsync({ uri: recordedUri, note: draft.trim() });
        setRecordedUri(null);
      } else {
        await sendText.mutateAsync(draft.trim());
      }
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that.");
    }
  }

  const busy = sendText.isPending || sendVoice.isPending;
  const canSend = !busy && (recordedUri !== null || draft.trim().length > 0);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#9a7622" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 p-4">
          {data?.items.length === 0 && (
            <Text className="px-6 py-10 text-center text-sm leading-5 text-ink-soft">
              Nothing has been sent on this matter yet. Ask the chamber
              anything about your case — in writing, or speak it.
            </Text>
          )}
          {data?.items.map((m) => (
            <Bubble key={m.id} message={m} onPlay={() => void play(m.id)} />
          ))}
        </ScrollView>
      )}

      <View className="gap-2 border-t border-rule bg-surface p-3">
        {error && <Text className="px-1 text-xs text-danger">{error}</Text>}

        {recording && (
          <View className="flex-row items-center gap-2 rounded-card bg-danger-wash px-3 py-2">
            <View className="size-2 rounded-full bg-danger" />
            <Text className="flex-1 text-sm text-danger">Recording…</Text>
            <Pressable onPress={() => void stopRecording()} hitSlop={8}>
              <Square size={18} color="#8e2f1f" fill="#8e2f1f" />
            </Pressable>
          </View>
        )}

        {recordedUri && !recording && (
          <View className="flex-row items-center gap-2 rounded-card bg-gold-wash px-3 py-2">
            <Mic size={16} color="#9a7622" />
            <Text className="flex-1 text-sm text-gold">Recording ready to send</Text>
            <Pressable onPress={() => setRecordedUri(null)} hitSlop={8}>
              <Trash2 size={17} color="#8e2f1f" />
            </Pressable>
          </View>
        )}

        <View className="flex-row items-end gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={recordedUri ? "Add a note (optional)" : "Write your question"}
            placeholderTextColor="#a29a8c"
            multiline
            className="max-h-28 flex-1 rounded-card border border-rule px-3 py-2.5 text-base text-ink"
          />

          {!recordedUri && (
            <Pressable
              onPress={() => void (recording ? stopRecording() : startRecording())}
              className={`size-11 items-center justify-center rounded-card ${
                recording ? "bg-danger" : "border border-rule bg-surface active:bg-gold-wash"
              }`}
            >
              {recording ? (
                <Square size={18} color="#ffffff" fill="#ffffff" />
              ) : (
                <Mic size={20} color="#9a7622" />
              )}
            </Pressable>
          )}

          <Pressable
            onPress={() => void send()}
            disabled={!canSend}
            className={`size-11 items-center justify-center rounded-card ${
              canSend ? "bg-ink active:bg-ink-soft" : "bg-rule"
            }`}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Send size={18} color={canSend ? "#ffffff" : "#4b443a"} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
