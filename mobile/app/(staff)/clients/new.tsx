import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useCreateClient } from "@/lib/clients";

/**
 * Taking a client's details, on a phone, in the moment you meet them.
 *
 * Only the name is required. A client met in a corridor may give a name and
 * a number and nothing else, and a form that refuses to save until every
 * box is filled would be filled in afterwards from memory, which is how a
 * telephone number ends up wrong.
 */
export default function NewClient() {
  const router = useRouter();
  const create = useCreateClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim().length >= 2 && !create.isPending;

  async function save() {
    setError(null);
    try {
      const client = await create.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });
      // Straight to the new client, not back to the list: the next thing
      // anybody does is give them access or open a matter for them.
      router.replace(`/clients/${client.id}`);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not save. Check the connection and try again."
      );
    }
  }

  return (
    <ScrollView
      contentContainerClassName="gap-5 p-4 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <Field label="Name" value={name} onChange={setName} placeholder="As it appears on the file" />
      <Field
        label="Telephone"
        value={phone}
        onChange={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        hint="What the office actually rings."
      />
      <Field
        label="Email"
        value={email}
        onChange={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        hint="Optional. Many clients have none."
      />
      <Field label="Address" value={address} onChange={setAddress} multiline />
      <Field
        label="Note"
        value={notes}
        onChange={setNotes}
        multiline
        hint="For the chamber. A client never sees this."
      />

      {error ? (
        <View className="rounded-card border border-rule bg-gold-wash px-4 py-3">
          <Text className="text-sm leading-6 text-ink">{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={save}
        disabled={!ready}
        className={`items-center rounded-card py-4 ${ready ? "bg-ink active:bg-ink-soft" : "bg-ink/40"}`}
      >
        {create.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Save client</Text>
        )}
      </Pressable>

      <Text className="px-1 text-center text-xs leading-5 text-ink-soft">
        Only the name is needed now. Everything else can be added later.
      </Text>
    </ScrollView>
  );
}
