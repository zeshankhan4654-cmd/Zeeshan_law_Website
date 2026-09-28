import { FolderPlus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  useAddFolder,
  useDeleteFolder,
  type LibraryFolder,
  type LibraryKind,
  type Shelf,
} from "@/lib/library-admin";

/**
 * The chamber's shelves, across the top of its library.
 *
 * A library fills faster than anything else in an office and a flat list of
 * four hundred entries is one nobody opens. These are how a chamber arranges
 * its own: by court, by subject, by the matter something was written for.
 *
 * "Not filed" is offered beside them and is the one that earns its place —
 * it is everything added in a hurry and never put away, which is the pile
 * that actually needs an afternoon.
 */
export function Shelves({
  kind,
  folders,
  unfiled,
  shelf,
  onPick,
  mayEdit,
}: {
  kind: LibraryKind;
  folders: LibraryFolder[];
  unfiled: number;
  shelf: Shelf;
  onPick: (shelf: Shelf) => void;
  mayEdit: boolean;
}) {
  const add = useAddFolder(kind);
  const remove = useDeleteFolder(kind);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function make() {
    const clean = name.trim();
    if (!clean) return;
    setError(null);
    try {
      await add.mutateAsync(clean);
      setName("");
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make that folder.");
    }
  }

  const chip = (label: string, on: boolean, onPress: () => void, count?: number) => (
    <Pressable
      key={label}
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-card border px-3 py-1.5 ${
        on ? "border-gold bg-gold-wash" : "border-rule bg-surface active:bg-gold-wash"
      }`}
    >
      <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>{label}</Text>
      {count !== undefined ? (
        <Text className="text-[11px] text-ink-soft">{count}</Text>
      ) : null}
    </Pressable>
  );

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-center gap-2">
        {chip("All", shelf === null, () => onPick(null))}
        {unfiled > 0 ? chip("Not filed", shelf === "none", () => onPick("none"), unfiled) : null}
        {folders.map((f) =>
          chip(f.name, shelf === f.id, () => onPick(f.id), f.count)
        )}

        {mayEdit && !adding ? (
          <Pressable
            testID="new-shelf"
            onPress={() => setAdding(true)}
            className="flex-row items-center gap-1.5 rounded-card border border-dashed border-rule px-3 py-1.5 active:bg-gold-wash"
          >
            <FolderPlus size={14} color="#9a7622" />
            <Text className="text-sm text-gold">Folder</Text>
          </Pressable>
        ) : null}
      </View>

      {adding ? (
        <View className="flex-row items-center gap-2">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="What to call it"
            placeholderTextColor="#a29a8c"
            autoFocus
            onSubmitEditing={() => void make()}
            returnKeyType="done"
            className="flex-1 rounded-card border border-rule px-3 py-2 text-base text-ink"
          />
          <Pressable
            onPress={() => void make()}
            className="rounded-card bg-ink px-4 py-2.5 active:bg-ink-soft"
          >
            <Text className="text-sm font-semibold text-white">Make it</Text>
          </Pressable>
          <Pressable onPress={() => { setAdding(false); setName(""); setError(null); }} hitSlop={8}>
            <X size={18} color="#4b443a" />
          </Pressable>
        </View>
      ) : null}

      {/* Offered only while that shelf is the one being looked at, so it
          cannot be tapped by accident from across the row. Nothing on it is
          lost: what was filed here goes back to "not filed". */}
      {mayEdit && typeof shelf === "number" ? (
        <Pressable
          onPress={() => void remove.mutateAsync(shelf).then(() => onPick(null))}
          hitSlop={6}
          className="self-start"
        >
          <Text className="text-xs font-semibold text-danger">
            Remove this folder — what is on it stays in the library
          </Text>
        </Pressable>
      ) : null}

      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
