import { Plus, ShieldCheck, UserCircle } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from "react-native";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useAddStaff, useIssuePassword, useRoles, useStaff, type StaffMember } from "@/lib/chamber-admin";

/**
 * Who works in the chamber.
 *
 * Adding a colleague and issuing a password both hand back a password shown
 * once, because the server keeps only its hash. Whoever is reading it out
 * needs it there and then, which is exactly the moment somebody is not at
 * a desk.
 */
export default function Staff() {
  const { data, isPending } = useStaff();
  const { data: roleData } = useRoles();
  const [adding, setAdding] = useState(false);
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  const roleLabel = (key: string) =>
    data?.roles.find((r) => r.roleKey === key)?.label ?? key;

  if (adding) {
    return (
      <AddStaff
        roles={data?.roles ?? []}
        onDone={(name, password) => {
          setAdding(false);
          setIssued({ name, password });
        }}
        onCancel={() => setAdding(false)}
      />
    );
  }

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-3 p-4 pb-24">
        {issued ? (
          <Issued name={issued.name} password={issued.password} onDone={() => setIssued(null)} />
        ) : null}

        {(data?.items ?? []).map((u) => (
          <Person key={u.id} person={u} roleLabel={roleLabel(u.role)} onIssued={setIssued} />
        ))}

        <Text className="px-1 pt-2 text-xs leading-5 text-ink-soft">
          What each of these roles may do is set from Roles. A colleague sees only the parts of
          the chamber their role allows.
        </Text>

        {roleData ? (
          <View className="gap-2 rounded-card border border-rule bg-surface p-4">
            <View className="flex-row items-center gap-2">
              <ShieldCheck size={16} color="#9a7622" />
              <Text className="text-sm font-semibold text-ink">Roles</Text>
            </View>
            {roleData.roles.map((r) => (
              <View key={r.roleKey} className="flex-row items-baseline gap-2">
                <Text className="flex-1 text-sm text-ink">{r.label}</Text>
                <Text className="text-xs text-ink-soft">
                  {r.isRoot ? "everything" : `${r.caps.length} permissions`} ·{" "}
                  {r.userCount} {r.userCount === 1 ? "person" : "people"}
                </Text>
              </View>
            ))}
            <Text className="text-xs leading-5 text-ink-soft">
              Changing what a role may do is done from the office on a computer. It is easy to
              lock yourself out of your own chamber with a mistaken tap.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={() => setAdding(true)}
        accessibilityRole="button"
        accessibilityLabel="Add a colleague"
        className="absolute bottom-5 right-5 size-14 items-center justify-center rounded-full bg-ink active:bg-ink-soft"
      >
        <Plus size={26} color="#ffffff" />
      </Pressable>
    </View>
  );
}

function Person({
  person,
  roleLabel,
  onIssued,
}: {
  person: StaffMember;
  roleLabel: string;
  onIssued: (v: { name: string; password: string }) => void;
}) {
  const issue = useIssuePassword();

  return (
    <View className="gap-2 rounded-card border border-rule bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <UserCircle size={20} color="#9a7622" />
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink">{person.fullName}</Text>
          <Text className="text-xs text-ink-soft">
            {roleLabel} · {person.username}
          </Text>
        </View>
      </View>
      <Text selectable className="text-xs text-ink-soft">
        {person.email}
      </Text>
      {person.mustChangePassword ? (
        <Text className="text-xs font-semibold text-gold">
          Has not yet changed the password they were given.
        </Text>
      ) : null}
      <Pressable
        onPress={async () => {
          const r = await issue.mutateAsync(person.id);
          onIssued({ name: person.fullName, password: r.password });
        }}
        disabled={issue.isPending}
        className="items-center rounded-card border border-rule py-2 active:bg-gold-wash"
      >
        {issue.isPending ? (
          <ActivityIndicator color="#9a7622" />
        ) : (
          <Text className="text-sm font-semibold text-ink-soft">Issue a new password</Text>
        )}
      </Pressable>
    </View>
  );
}

function Issued({
  name,
  password,
  onDone,
}: {
  name: string;
  password: string;
  onDone: () => void;
}) {
  return (
    <View className="gap-2 rounded-card border border-gold bg-gold-wash p-4">
      <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gold">
        Read this to {name} once
      </Text>
      <Text selectable className="text-lg font-semibold text-ink">
        {password}
      </Text>
      <Text className="text-xs leading-5 text-ink-soft">
        Shown once — the chamber keeps no copy. They will be made to change it when they sign in.
      </Text>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => void Share.share({ message: `Lawyer360 — your starting password: ${password}` })}
          className="flex-1 items-center rounded-card border border-gold py-2.5"
        >
          <Text className="text-sm font-semibold text-gold">Send it</Text>
        </Pressable>
        <Pressable onPress={onDone} className="flex-1 items-center rounded-card border border-rule py-2.5">
          <Text className="text-sm font-semibold text-ink-soft">Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddStaff({
  roles,
  onDone,
  onCancel,
}: {
  roles: { roleKey: string; label: string }[];
  onDone: (name: string, password: string) => void;
  onCancel: () => void;
}) {
  const add = useAddStaff();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]?.roleKey ?? "associate");
  const [error, setError] = useState<string | null>(null);

  const ready =
    fullName.trim().length >= 2 && username.trim().length >= 3 && email.includes("@") && !add.isPending;

  async function save() {
    setError(null);
    try {
      const made = await add.mutateAsync({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        role,
      });
      onDone(fullName.trim(), made.password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add them. Try again.");
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Field label="Name" value={fullName} onChange={setFullName} />
      <Field
        label="Handle"
        value={username}
        onChange={setUsername}
        autoCapitalize="none"
        hint="What signs their entries on a case file. Letters, numbers, dots and hyphens."
      />
      <Field
        label="Email"
        value={email}
        onChange={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        hint="What they sign in with. It must be theirs alone across the whole platform."
      />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">Role</Text>
        <View className="flex-row flex-wrap gap-2">
          {roles.map((r) => {
            const on = role === r.roleKey;
            return (
              <Pressable
                key={r.roleKey}
                onPress={() => setRole(r.roleKey)}
                className={`rounded-card border px-3 py-2 ${on ? "border-gold bg-gold-wash" : "border-rule bg-surface"}`}
              >
                <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

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
        {add.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Add them</Text>
        )}
      </Pressable>

      <Pressable onPress={onCancel} className="items-center py-2">
        <Text className="text-sm font-semibold text-ink-soft">Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}
