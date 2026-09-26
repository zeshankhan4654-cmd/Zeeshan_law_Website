import { Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

/**
 * A labelled box to type in.
 *
 * Lifted out of the registration screen, which had it privately, once a
 * second form needed the same thing. Every form in the app should look like
 * the same form.
 */
export function Field({
  label,
  value,
  onChange,
  hint,
  placeholder,
  keyboardType,
  autoCapitalize = "words",
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "words" | "sentences";
  /** For an address or a note, which are rarely one line. */
  multiline?: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a29a8c"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        className={`rounded-card border border-rule bg-surface px-3 py-3 text-base text-ink ${
          multiline ? "h-24" : ""
        }`}
        style={multiline ? { textAlignVertical: "top" } : undefined}
      />
      {hint ? <Text className="text-xs leading-5 text-ink-soft">{hint}</Text> : null}
    </View>
  );
}
