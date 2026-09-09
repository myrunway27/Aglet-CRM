import Link from "next/link";

// One quiet reading layout for the policy pages: a title, an "updated" line,
// and prose with numbered sections. Nothing else competes with the text.
export function LegalDoc({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <article className="max-w-2xl mx-auto mt-4">
      <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
      <p className="text-xs text-stone-500 mt-1">Last updated {updated}</p>
      <p className="text-[15px] text-stone-700 mt-4 leading-relaxed">{intro}</p>
      <div className="mt-6 space-y-7 text-[15px] leading-relaxed text-stone-800 [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:text-brand-800 [&_h2]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p+p]:mt-2 [&_a]:text-brand-700 [&_a]:underline">
        {children}
      </div>
      <p className="mt-10 text-xs text-stone-500">
        Questions about any of this: <a href="mailto:thetruereview18@gmail.com" className="underline">thetruereview18@gmail.com</a>.
        See also our <Link href="/guidelines" className="underline">review guidelines</Link>,{" "}
        <Link href="/terms" className="underline">terms of service</Link>,{" "}
        <Link href="/privacy" className="underline">privacy policy</Link> and{" "}
        <Link href="/trust" className="underline">how we keep reviews honest</Link>.
      </p>
    </article>
  );
}
