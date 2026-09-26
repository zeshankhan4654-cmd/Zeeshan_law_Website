import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

/**
 * Choosing a date, for a cause list.
 *
 * Written rather than installed. A native picker is a native module, which
 * would mean rebuilding the app before anybody could even look at this, and
 * it behaves differently on each platform. This is the same everywhere,
 * including in the demonstration.
 *
 * The quick choices come first because a court date is usually said as "a
 * fortnight" rather than as a number, and the month is there for when it
 * is not.
 */

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Local midnight, so a date never slips a day on the way to the server. */
export function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-first, which is how a cause list is read here. */
function leadingBlanks(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function DateChoice({
  value,
  onChange,
}: {
  /** YYYY-MM-DD, or "" for nothing chosen yet. */
  value: string;
  onChange: (iso: string) => void;
}) {
  const today = startOfDay(new Date());
  const chosen = value ? new Date(`${value}T00:00:00`) : null;
  const [shown, setShown] = useState(() => chosen ?? today);

  const year = shown.getFullYear();
  const month = shown.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const blanks = leadingBlanks(year, month);

  const quick = [
    { label: "Tomorrow", date: new Date(today.getTime() + DAY) },
    { label: "In a week", date: new Date(today.getTime() + 7 * DAY) },
    { label: "In a fortnight", date: new Date(today.getTime() + 14 * DAY) },
  ];

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        {quick.map((q) => {
          const iso = isoDay(q.date);
          const on = value === iso;
          return (
            <Pressable
              key={q.label}
              onPress={() => {
                onChange(iso);
                setShown(q.date);
              }}
              className={`flex-1 items-center rounded-card border py-2 ${
                on ? "border-gold bg-gold-wash" : "border-rule bg-surface"
              }`}
            >
              <Text className={`text-xs font-semibold ${on ? "text-gold" : "text-ink-soft"}`}>
                {q.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="rounded-card border border-rule bg-surface p-3">
        <View className="flex-row items-center justify-between pb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => setShown(new Date(year, month - 1, 1))}
            className="size-9 items-center justify-center rounded-card active:bg-gold-wash"
          >
            <ChevronLeft size={20} color="#4b443a" />
          </Pressable>
          <Text className="text-sm font-semibold text-ink">
            {MONTHS[month]} {year}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => setShown(new Date(year, month + 1, 1))}
            className="size-9 items-center justify-center rounded-card active:bg-gold-wash"
          >
            <ChevronRight size={20} color="#4b443a" />
          </Pressable>
        </View>

        <View className="flex-row">
          {WEEKDAYS.map((d, i) => (
            <Text
              key={i}
              className="flex-1 pb-1 text-center text-[11px] font-semibold text-ink-soft"
            >
              {d}
            </Text>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {Array.from({ length: blanks }).map((_, i) => (
            <View key={`b${i}`} style={{ width: `${100 / 7}%` }} className="h-10" />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const date = new Date(year, month, i + 1);
            const iso = isoDay(date);
            const on = value === iso;
            const isToday = iso === isoDay(today);
            const past = date < today;
            return (
              <View key={iso} style={{ width: `${100 / 7}%` }} className="h-10 p-0.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={iso}
                  onPress={() => onChange(iso)}
                  className={`flex-1 items-center justify-center rounded-card ${
                    on ? "bg-ink" : isToday ? "bg-gold-wash" : ""
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      on
                        ? "font-semibold text-white"
                        : past
                          ? "text-ink-soft/50"
                          : isToday
                            ? "font-semibold text-gold"
                            : "text-ink"
                    }`}
                  >
                    {i + 1}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
