import { Text, View } from "react-native";

/**
 * Renders the same lightweight markup the office editor writes: a line
 * beginning "## " is a heading, "- " a bullet, "> " a quotation, a blank
 * line separates paragraphs. Nothing else is interpreted, so no markup
 * typed into an article can produce anything but text.
 */
export function ArticleBody({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];

  const flush = (key: string) => {
    if (paragraph.length === 0) return;
    blocks.push(
      <Text key={key} className="mb-4 text-[15px] leading-6 text-ink-soft">
        {paragraph.join(" ")}
      </Text>
    );
    paragraph = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();

    if (line === "") {
      flush(`p${i}`);
    } else if (line.startsWith("## ")) {
      flush(`p${i}`);
      blocks.push(
        <Text key={`h${i}`} className="mt-4 mb-2 text-lg font-semibold text-ink">
          {line.slice(3)}
        </Text>
      );
    } else if (line.startsWith("- ")) {
      flush(`p${i}`);
      blocks.push(
        <View key={`b${i}`} className="mb-2 flex-row gap-2 pl-1">
          <Text className="text-[15px] leading-6 text-gold">•</Text>
          <Text className="flex-1 text-[15px] leading-6 text-ink-soft">{line.slice(2)}</Text>
        </View>
      );
    } else if (line.startsWith("> ")) {
      flush(`p${i}`);
      blocks.push(
        <View key={`q${i}`} className="mb-4 border-l-2 border-gold bg-gold-wash px-4 py-3">
          <Text className="text-[15px] leading-6 italic text-ink">{line.slice(2)}</Text>
        </View>
      );
    } else {
      paragraph.push(line);
    }
  });

  flush("p-last");

  return <View>{blocks}</View>;
}
