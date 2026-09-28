import { Pressable, Text, View } from "react-native";
import { useFileEntry, useFolders, type LibraryKind } from "@/lib/library-admin";

/**
 * Where this entry is shelved.
 *
 * Saved the moment it is tapped rather than with the rest of the form,
 * because it is not a property of the writing — it is where the chamber
 * keeps it, and changing your mind about that should not require saving a
 * page of prose you did not touch.
 *
 * Shown only for an entry that exists. Something still being written has
 * nowhere to be put yet.
 */
export function FileOnShelf({
  kind,
  entryId,
  folderId,
}: {
  kind: LibraryKind;
  entryId: number;
  folderId: number | null;
}) {
  const { data } = useFolders(kind);
  const file = useFileEntry(kind);
  const folders = data?.items ?? [];

  if (folders.length === 0) return null;

  const chip = (label: string, on: boolean, next: number | null) => (
    <Pressable
      key={label}
      onPress={() => void file.mutateAsync({ id: entryId, folderId: next })}
      disabled={file.isPending}
      className={`rounded-card border px-3 py-1.5 ${
        on ? "border-gold bg-gold-wash" : "border-rule bg-surface active:bg-gold-wash"
      }`}
    >
      <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>{label}</Text>
    </Pressable>
  );

  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
        Kept in
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {chip("Not filed", folderId === null, null)}
        {folders.map((f) => chip(f.name, folderId === f.id, f.id))}
      </View>
    </View>
  );
}
