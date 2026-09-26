import { Reveal } from "@/components/site/Reveal";
import { getSettings } from "@/lib/site";

export const metadata = {
  title: "Privacy — The Arbitrator & Law Associates",
  description:
    "What this chamber records, where it is kept, and who can see it.",
};

/**
 * The privacy notice.
 *
 * It exists for two reasons. Google Play and the App Store both refuse an
 * app that handles personal data without a policy at a public address, so
 * this page is a prerequisite for the mobile app being listed at all. And a
 * chamber holding privileged material ought to be able to say plainly what
 * it holds.
 *
 * Everything stated here is drawn from what the software actually does,
 * rather than from a template. Where a fact depends on the chamber rather
 * than on the code — who the advocate is, how to write to them — it is read
 * from Site Settings and marked as missing when unset, in keeping with the
 * rule the rest of the site follows: absent rather than invented.
 */
export default async function Privacy() {
  const settings = await getSettings();
  const firm = settings["firm.name"];
  const address = settings["firm.address"];
  const email = settings["contact.email"];
  const phone = settings["contact.phone"];

  const reachable = email || phone || address;

  return (
    <>
      <header className="border-b border-rule bg-ink px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Privacy</p>
          <h1 className="font-display text-4xl font-medium text-white">
            What this chamber records
          </h1>
          <p className="max-w-2xl leading-7 text-white/70">
            Written plainly, because a client ought to be able to read it. It covers this website
            and the Lawyer360 mobile app alike — they are the same records seen two ways.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-10 px-6 py-14">
        <Reveal className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">Who holds these records</h2>
          <p className="leading-7 text-ink-soft">
            {firm}. The records described below are held by this chamber on its own server, and
            the chamber alone decides what is done with them.
          </p>
          {address && <p className="leading-7 text-ink-soft">{address}</p>}
        </Reveal>

        <Reveal className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">If you only visit the site</h2>
          <p className="leading-7 text-ink-soft">
            Reading these pages creates no account and no profile of you. There is no advertising
            here and no tracking for advertisers.
          </p>
          <p className="leading-7 text-ink-soft">
            If you send an enquiry through the contact form, the chamber keeps what you typed —
            your name, your telephone number or email if you gave one, and your message — so that
            somebody can answer it. Sending an enquiry does not make you a client, and nothing you
            send creates a professional relationship until the chamber says so.
          </p>
          <p className="leading-7 text-ink-soft">
            The server counts recent attempts against the network address they came from, for
            sign-ins and enquiries, so that the site cannot be flooded. That count is a number and
            an address, not a record of what you read.
          </p>
        </Reveal>

        <Reveal className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">If you are a client</h2>
          <p className="leading-7 text-ink-soft">
            The chamber keeps what a chamber keeps: your name and how to reach you, the matters it
            acts for you in, hearing dates and what happened at them, documents on your file, the
            fees agreed and received, and the messages between you and the office — including
            spoken notes, if you send one from the app.
          </p>
          <p className="leading-7 text-ink-soft">
            You are given a sign-in of your own, by the chamber. It shows you your own matters and
            nothing else. It does not show you another client&rsquo;s matter, and it does not show
            you everything on your own file either: the chamber&rsquo;s internal notes, and its
            record of what a hearing decided, stay within the chamber. Which documents you can see
            is decided document by document.
          </p>
          <p className="leading-7 text-ink-soft">
            Much of this is privileged. It is treated that way.
          </p>
        </Reveal>

        <Reveal className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">Who else can see it</h2>
          <p className="leading-7 text-ink-soft">
            Your records are not sold, not shared with advertisers, and not used to train anything.
          </p>
          <p className="leading-7 text-ink-soft">
            Lawyer360 is used by other chambers, each with its own records. No other chamber can
            see yours. That is not a promise about conduct — every record carries the chamber it
            belongs to, and the database refuses a query that reaches outside it.
          </p>
          <p className="leading-7 text-ink-soft">
            Two things do leave the chamber&rsquo;s own server, and only these. If you turn on
            reminders in the app, a device identifier is sent to Expo&rsquo;s notification service
            so that a message about tomorrow&rsquo;s hearing can reach your telephone; the message
            says that a hearing is listed, not what the matter concerns. And the chamber may offer
            a piece of its own legal writing or a note on a reported judgment to a library open to
            every advocate on the platform — that is the chamber&rsquo;s own work on the law, never
            a client&rsquo;s file, and never anything identifying a client.
          </p>
        </Reveal>

        <Reveal className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">How long it is kept</h2>
          <p className="leading-7 text-ink-soft">
            A file is kept for as long as the chamber may need it — a matter can be reopened, and
            an advocate can be asked years later to account for what was advised. Backups of the
            whole system are taken nightly and the last thirty days of them are retained, so a
            record deleted today may survive in a backup for up to a month.
          </p>
        </Reveal>

        <Reveal className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">Asking what is held</h2>
          <p className="leading-7 text-ink-soft">
            You may ask the chamber what it holds about you, ask for a correction, or ask for a
            copy. Write or telephone, and say which matter you are asking about.
          </p>
          {reachable ? (
            <ul className="space-y-1 leading-7 text-ink-soft">
              {phone && <li>Telephone: {phone}</li>}
              {email && <li>Email: {email}</li>}
              {address && <li>{address}</li>}
            </ul>
          ) : (
            <p className="rounded-card border border-rule bg-gold-wash px-5 py-4 leading-7 text-ink">
              The chamber has not yet set a telephone number or an address in Site Settings. Until
              it does, this page cannot tell a reader where to write, and none is invented here.
            </p>
          )}
          <p className="leading-7 text-ink-soft">
            Deleting a record is not always possible while a matter is live or while the chamber is
            under a duty to retain it. Where that is so, the chamber will say which duty it relies
            on.
          </p>
        </Reveal>

        <Reveal className="space-y-3 border-t border-rule pt-8">
          <p className="text-sm leading-6 text-ink-soft">
            This notice describes what the software does. It is not legal advice on your own
            obligations, and a chamber adopting it should read it against the law that binds it
            before relying on it.
          </p>
        </Reveal>
      </div>
    </>
  );
}
