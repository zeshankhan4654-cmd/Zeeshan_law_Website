import * as ImagePicker from "expo-image-picker";
import { Camera, ImageIcon } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Switch, Text, View } from "react-native";
import { Field } from "@/components/Field";
import { useAddDocument } from "@/lib/documents";

/**
 * Photographing a document onto the file.
 *
 * Built around what actually happens at a court counter: a certified copy
 * is handed over, and an advocate has about a minute before it goes into a
 * bag. So the picture is taken first and named afterwards — asking for a
 * title before the camera opens is how the photograph never gets taken.
 *
 * Whether the client may see it is asked every time and answered "no" until
 * somebody says otherwise. A document shared by accident cannot be
 * unshared from the client's memory.
 */
export function AddDocument({ caseId }: { caseId: number }) {
  const add = useAddDocument(caseId);
  const [picked, setPicked] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [title, setTitle] = useState("");
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function nameFor(uri: string, fallback: string): string {
    const last = uri.split("/").pop()?.split("?")[0] ?? "";
    return /\.[a-z0-9]{1,8}$/i.test(last) ? last : fallback;
  }

  async function take(from: "camera" | "library") {
    setError(null);
    try {
      if (from === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("The camera is not allowed. You can still choose a picture instead.");
          return;
        }
      }
      const result =
        from === "camera"
          ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setPicked({
        uri: asset.uri,
        name: asset.fileName || nameFor(asset.uri, "document.jpg"),
        type: asset.mimeType || "image/jpeg",
      });
    } catch {
      setError("Could not open the camera on this device.");
    }
  }

  async function save() {
    if (!picked) return;
    setError(null);
    try {
      await add.mutateAsync({
        ...picked,
        title: title.trim() || picked.name,
        clientVisible: shared,
      });
      setPicked(null);
      setTitle("");
      setShared(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the document.");
    }
  }

  if (!picked) {
    return (
      <View className="gap-2">
        <View className="flex-row gap-2">
          {/* A browser has no camera to open here, so it is not offered one. */}
          {Platform.OS !== "web" && (
            <Pressable
              onPress={() => void take("camera")}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-card border border-gold py-2.5 active:bg-gold-wash"
            >
              <Camera size={16} color="#9a7622" />
              <Text className="text-sm font-semibold text-gold">Photograph</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => void take("library")}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-card border border-rule py-2.5 active:bg-gold-wash"
          >
            <ImageIcon size={16} color="#4b443a" />
            <Text className="text-sm font-semibold text-ink-soft">
              {Platform.OS === "web" ? "Choose a file" : "Choose a picture"}
            </Text>
          </Pressable>
        </View>
        {error ? <Text className="text-xs text-danger">{error}</Text> : null}
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-card border border-gold bg-gold-wash p-3.5">
      <Text className="text-xs leading-5 text-ink" numberOfLines={1}>
        {picked.name}
      </Text>

      <Field
        label="What it is"
        value={title}
        onChange={setTitle}
        placeholder="Certified copy of the order"
        autoCapitalize="sentences"
      />

      <View className="flex-row items-center gap-3 rounded-card border border-rule bg-surface p-3">
        <Switch
          value={shared}
          onValueChange={setShared}
          trackColor={{ true: "#9a7622", false: "#d8d2c8" }}
          thumbColor="#ffffff"
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">Let the client see it</Text>
          <Text className="text-xs leading-5 text-ink-soft">
            Off by default. A document shared by mistake cannot be taken back out of a
            client&rsquo;s memory.
          </Text>
        </View>
      </View>

      {error ? <Text className="text-xs text-danger">{error}</Text> : null}

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => {
            setPicked(null);
            setTitle("");
            setShared(false);
          }}
          className="flex-1 items-center rounded-card border border-rule bg-surface py-2.5"
        >
          <Text className="text-sm font-semibold text-ink-soft">Leave it</Text>
        </Pressable>
        <Pressable
          onPress={() => void save()}
          disabled={add.isPending}
          className={`flex-1 items-center rounded-card py-2.5 ${
            add.isPending ? "bg-ink/40" : "bg-ink active:bg-ink-soft"
          }`}
        >
          {add.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-sm font-semibold text-white">Put it on the file</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
