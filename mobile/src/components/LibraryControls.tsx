import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";
import type { ShareState } from "@/lib/library-admin";

/**
 * The two decisions every library entry carries, and the rules that govern
 * them.
 *
 * Publishing puts an entry on the chamber's own website under the chamber's
 * name. Offering it to the shared library puts it in front of every advocate
 * on the platform. Both are refused by the API when the entry is not fit,
 * and both say so here first — a switch that throws an error after being
 * pressed teaches nothing about why.
 */

export function PublishSwitch({
  published,
  onChange,
  blockedBecause,
  mayPublish,
}: {
  published: boolean;
  onChange: (v: boolean) => void;
  /** Why publishing is refused, or null when it is allowed. */
  blockedBecause: string | null;
  mayPublish: boolean;
}) {
  const locked = !mayPublish || (blockedBecause !== null && !published);

  return (
    <View className="gap-2 rounded-card border border-rule bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Switch
          value={published}
          onValueChange={onChange}
          disabled={locked}
          trackColor={{ true: "#9a7622", false: "#d8d2c8" }}
          thumbColor="#ffffff"
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">Put it on the chamber's website</Text>
          <Text className="text-xs leading-5 text-ink-soft">
            Anybody visiting your site can read it, under the chamber's name.
          </Text>
        </View>
      </View>

      {!mayPublish ? (
        <Text className="text-xs leading-5 text-ink-soft">
          Publishing is not among your permissions. You can write and save a draft.
        </Text>
      ) : blockedBecause && !published ? (
        <Text className="text-xs leading-5 text-danger">{blockedBecause}</Text>
      ) : null}
    </View>
  );
}

export function ShareRow({
  shareState,
  onOffer,
  busy,
  blockedBecause,
  mayShare,
}: {
  shareState: ShareState;
  onOffer: (offer: boolean) => void;
  busy: boolean;
  blockedBecause: string | null;
  mayShare: boolean;
}) {
  const offered = shareState === "pending";
  const taken = shareState === "approved";
  const declined = shareState === "declined";

  return (
    <View className="gap-2 rounded-card border border-rule bg-surface p-4">
      <Text className="text-sm font-semibold text-ink">The shared library</Text>
      <Text className="text-xs leading-5 text-ink-soft">
        Open to every advocate on the platform, not only to your clients. An entry here has to
        stand on its own in front of somebody who cannot ask you what you meant.
      </Text>

      {taken ? (
        <Text className="text-xs font-semibold text-gold">
          In the shared library, naming your chamber as the contributor.
        </Text>
      ) : offered ? (
        <Text className="text-xs font-semibold text-ink-soft">
          Offered, and waiting to be read.
        </Text>
      ) : declined ? (
        <Text className="text-xs leading-5 text-ink-soft">
          Not taken. It stays yours and stays on your own site if published.
        </Text>
      ) : null}

      {!mayShare ? (
        <Text className="text-xs leading-5 text-ink-soft">
          Offering to the shared library is not among your permissions.
        </Text>
      ) : blockedBecause && !taken && !offered ? (
        <Text className="text-xs leading-5 text-danger">{blockedBecause}</Text>
      ) : (
        <Pressable
          onPress={() => onOffer(!(taken || offered))}
          disabled={busy}
          className="items-center rounded-card border border-gold py-2.5 active:bg-gold-wash"
        >
          {busy ? (
            <ActivityIndicator color="#9a7622" />
          ) : (
            <Text className="text-sm font-semibold text-gold">
              {taken || offered ? "Withdraw it" : "Offer it to the shared library"}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}
