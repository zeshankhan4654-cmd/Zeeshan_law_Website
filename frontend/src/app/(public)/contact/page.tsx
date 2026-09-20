import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { Reveal } from "@/components/site/Reveal";
import { Social } from "@/components/site/Social";
import { getSettings, whatsappHref } from "@/lib/site";

export const metadata = {
  title: "Contact — The Arbitrator & Law Associates",
  description: "Speak to the chamber at the Peshawar High Court.",
};

export default async function Contact() {
  const settings = await getSettings();

  const address = settings["firm.address"];
  const phone = settings["contact.phone"];
  const phone2 = settings["contact.phone2"];
  const email = settings["contact.email"];
  const hours = settings["firm.hours"];
  const mapEmbed = settings["contact.mapEmbed"];
  const whatsapp = whatsappHref(settings);

  // Directions work from the address alone when no map link has been set,
  // which is what the chamber asked for on this page.
  const directions =
    settings["contact.mapUrl"] ||
    (address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : "");

  return (
    <>
      <header className="border-b border-rule bg-ink px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Contact</p>
          <h1 className="font-display text-4xl font-medium text-white">Speak to the chamber</h1>
          <p className="max-w-2xl leading-7 text-white/70">
            Bring the papers you have, including anything with a date printed
            on it. If a deadline falls in the next few days, telephone rather
            than write.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1fr_1.1fr]">
        <Reveal className="space-y-6">
          <div className="space-y-5 rounded-card border border-rule bg-surface p-7">
            <h2 className="font-display text-xl font-medium text-ink">The chamber</h2>

            <ul className="space-y-4 text-sm">
              {address && (
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <div className="space-y-1">
                    <p className="leading-6 text-ink">{address}</p>
                    {directions && (
                      <a
                        href={directions}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-gold hover:underline"
                      >
                        <Navigation className="size-3.5" /> Directions
                      </a>
                    )}
                  </div>
                </li>
              )}

              {(phone || phone2) && (
                <li className="flex gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <div className="space-y-1">
                    {[phone, phone2].filter(Boolean).map((n) => (
                      <a
                        key={n}
                        href={`tel:${n!.replace(/\s/g, "")}`}
                        className="block text-ink hover:text-gold"
                      >
                        {n}
                      </a>
                    ))}
                  </div>
                </li>
              )}

              {email && (
                <li className="flex gap-3">
                  <Mail className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <a href={`mailto:${email}`} className="break-all text-ink hover:text-gold">
                    {email}
                  </a>
                </li>
              )}

              {hours && (
                <li className="flex gap-3">
                  <Clock className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <span className="text-ink">{hours}</span>
                </li>
              )}
            </ul>

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-card bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Message on WhatsApp
              </a>
            )}

            {/* The chamber asked for the accounts here as well as the footer. */}
            <div className="border-t border-rule pt-5">
              <p className="pb-3 text-xs font-semibold tracking-[0.1em] text-ink-soft uppercase">
                Follow the chamber
              </p>
              <Social settings={settings} className="text-ink-soft" />
            </div>
          </div>

          {mapEmbed && (
            <div className="overflow-hidden rounded-card border border-rule">
              <iframe
                src={mapEmbed}
                title="The chamber on the map"
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </Reveal>

        <Reveal>
          <div className="rounded-card border border-rule bg-surface p-7">
            <h2 className="font-display text-xl font-medium text-ink">Send an enquiry</h2>
            <p className="pt-2 pb-6 text-sm leading-6 text-ink-soft">
              The chamber reads every enquiry. You will usually hear back
              within a working day.
            </p>
            <EnquiryForm />
          </div>
        </Reveal>
      </div>
    </>
  );
}
