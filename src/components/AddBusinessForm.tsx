"use client";

import { useActionState, useRef, useState } from "react";
import { addBusiness, type FormState } from "@/actions/business";
import { CATEGORIES, isFoodCategory } from "@/lib/categories";
import { FOOD_TAGS, GENERAL_TAGS } from "@/lib/tags";
import { DIET_STANDARDS, CERTIFIERS } from "@/lib/diet";
import { DAY_SHORT } from "@/lib/hours";

type Candidate = {
  address: string;
  zip: string;
  hours: string;
  phone: string;
  website: string;
  email: string;
  label: string;
  lat?: number;
  lng?: number;
};

const input =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600";
const chip =
  "cursor-pointer text-xs border border-stone-300 rounded-full px-2.5 py-1.5 has-checked:bg-brand-700 has-checked:text-white has-checked:border-brand-700 hover:border-brand-600 select-none bg-white";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-stone-200 bg-stone-50/60 p-3">
      <summary className="text-sm font-medium cursor-pointer">
        {title} <span className="text-stone-400 font-normal">· optional</span>
      </summary>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </details>
  );
}

export function AddBusinessForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addBusiness, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [looking, setLooking] = useState(false);
  const [category, setCategory] = useState("");
  const foodMode = isFoodCategory(category);

  const lookUp = async () => {
    const form = formRef.current;
    if (!form) return;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value.trim();
    const city = (form.elements.namedItem("city") as HTMLInputElement)?.value.trim();
    if (!name) {
      setCandidates([]);
      return;
    }
    setLooking(true);
    try {
      const res = await fetch(
        `/api/place-lookup?q=${encodeURIComponent(city ? `${name}, ${city}` : name)}`
      );
      const data = await res.json();
      setCandidates(data.results ?? []);
    } catch {
      setCandidates([]);
    } finally {
      setLooking(false);
    }
  };

  const applyCandidate = (c: Candidate) => {
    const form = formRef.current;
    if (!form) return;
    const set = (field: string, value: string) => {
      const el = form.elements.namedItem(field) as HTMLInputElement | null;
      if (el && value) el.value = value;
    };
    set("address", c.address);
    set("zip", c.zip);
    set("phone", c.phone);
    set("website", c.website);
    set("contactEmail", c.email);
    set("hours", c.hours);
    if (c.lat) set("lat", String(c.lat));
    if (c.lng) set("lng", String(c.lng));
    setCandidates(null);
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="max-w-lg mx-auto bg-white rounded-xl border border-stone-200 p-6 mt-4 space-y-4"
    >
      <input type="hidden" name="lat" />
      <input type="hidden" name="lng" />

      <label className="block">
        <span className="text-sm font-medium">What&apos;s it called?</span>
        <input name="name" required minLength={2} maxLength={100} autoFocus className={input} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">
            Kind of place <span className="text-stone-400 font-normal">· optional</span>
          </span>
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${input} bg-white`}
          >
            <option value="">Not sure yet</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">
            City <span className="text-stone-400 font-normal">· optional</span>
          </span>
          <input name="city" maxLength={60} className={input} />
        </label>
      </div>

      <button
        type="button"
        onClick={lookUp}
        disabled={looking}
        className="w-full text-sm rounded-lg border border-brand-600 text-brand-700 px-3 py-2 hover:bg-brand-50 disabled:opacity-50 cursor-pointer"
      >
        {looking ? "Searching…" : "🔍 Look up the address for me"}
      </button>
      {candidates !== null && candidates.length === 0 && (
        <p className="text-xs text-stone-500">
          Couldn&apos;t find it — no problem, you can type the details below or just save it now.
        </p>
      )}
      {candidates && candidates.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-stone-500">Pick the right one:</p>
          {candidates.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyCandidate(c)}
              className="block w-full text-left text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-2 hover:border-brand-600 cursor-pointer"
            >
              📍 {c.label}
            </button>
          ))}
        </div>
      )}

      <Section
        title="Where and how to reach it"
        hint="Anything you know. The lookup button above fills most of this in."
      >
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <label className="block col-span-2">
              <span className="text-xs text-stone-600">Street address</span>
              <input name="address" maxLength={160} className={input} />
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Zip code</span>
              <input name="zip" maxLength={12} className={input} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-stone-600">Phone</span>
              <input name="phone" maxLength={30} className={input} />
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Website</span>
              <input name="website" maxLength={120} placeholder="example.com" className={input} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <label className="block">
              <span className="text-xs text-stone-600">
                Business email <span className="text-stone-400">— we&apos;ll let them know they&apos;ve been listed</span>
              </span>
              <input name="contactEmail" type="email" maxLength={120} className={input} />
            </label>
          </div>
        </div>
      </Section>

      <Section title="Price level">
        <select name="priceLevel" defaultValue="0" className={`${input} bg-white`}>
          <option value="0">Not sure</option>
          <option value="1">$ — cheap</option>
          <option value="2">$$ — moderate</option>
          <option value="3">$$$ — pricey</option>
          <option value="4">$$$$ — splurge</option>
        </select>
      </Section>

      <Section
        title="Opening hours"
        hint="Leave a day blank if it's closed. 24-hour times, e.g. 09:00 and 22:30."
      >
        <div className="space-y-1.5">
          {DAY_SHORT.map((d, i) => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-10 text-xs text-stone-600">{d}</span>
              <input
                name={`open_${i}`}
                placeholder="09:00"
                pattern="[0-9]{1,2}:[0-9]{2}"
                className="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <span className="text-xs text-stone-400">to</span>
              <input
                name={`close_${i}`}
                placeholder="22:00"
                pattern="[0-9]{1,2}:[0-9]{2}"
                className="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Features">
        <div className="flex flex-wrap gap-1.5">
          {(foodMode ? [...FOOD_TAGS, ...GENERAL_TAGS] : GENERAL_TAGS).map((t) => (
            <label key={t.slug} className={chip}>
              <input type="checkbox" name="tags" value={t.slug} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </Section>

      {/* Dietary detail is only meaningful for places that serve food. */}
      {foodMode && (
        <Section
          title="Dietary details"
          hint="The specifics people actually need — a generic “kosher” tag doesn't help someone who keeps cholov yisroel."
        >
          <div className="flex flex-wrap gap-1.5">
            {DIET_STANDARDS.map((s) => (
              <label key={s.slug} title={s.hint} className={chip}>
                <input type="checkbox" name="standards" value={s.slug} className="sr-only" />
                {s.label}
              </label>
            ))}
          </div>
          <label className="block mt-2">
            <span className="text-xs text-stone-600">Certifying agency</span>
            <input
              name="certifier"
              list="certifier-options"
              maxLength={40}
              placeholder="e.g. OU, Star-K, local vaad"
              className={input}
            />
            <datalist id="certifier-options">
              {CERTIFIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </Section>
      )}

      <Section title="Description">
        <textarea name="description" rows={3} maxLength={1000} className={input} />
      </Section>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-700 text-white py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Adding…" : "Add it"}
      </button>
      <p className="text-xs text-stone-500 text-center">
        Only the name is needed. Anyone can fill in the rest later — including the owner.
      </p>
    </form>
  );
}
