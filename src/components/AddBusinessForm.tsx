"use client";

import { useActionState, useRef, useState } from "react";
import { addBusiness, type FormState } from "@/actions/business";
import { CATEGORIES } from "@/lib/categories";
import { TAGS } from "@/lib/tags";
import { DIET_STANDARDS, CERTIFIERS } from "@/lib/diet";
import { DAY_SHORT } from "@/lib/hours";

type Candidate = {
  address: string;
  zip: string;
  hours: string;
  phone: string;
  website: string;
  label: string;
  lat?: number;
  lng?: number;
};

export function AddBusinessForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addBusiness, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [looking, setLooking] = useState(false);

  const lookUp = async () => {
    const form = formRef.current;
    if (!form) return;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value.trim();
    const city = (form.elements.namedItem("city") as HTMLInputElement)?.value.trim();
    if (!name || !city) {
      setCandidates([]);
      return;
    }
    setLooking(true);
    try {
      const res = await fetch(`/api/place-lookup?q=${encodeURIComponent(`${name}, ${city}`)}`);
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
      <label className="block">
        <span className="text-sm font-medium">Business name</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Category</span>
        <select
          name="category"
          required
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="">Choose…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium">City</span>
        <input
          name="city"
          required
          minLength={2}
          maxLength={60}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </label>
      <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium">
            Location &amp; contact <span className="text-stone-400 font-normal">(optional)</span>
          </span>
          <button
            type="button"
            onClick={lookUp}
            disabled={looking}
            className="text-xs rounded-lg border border-brand-600 text-brand-700 px-2.5 py-1.5 hover:bg-brand-50 disabled:opacity-50 cursor-pointer"
          >
            {looking ? "Searching…" : "🔍 Auto-fill from name + city"}
          </button>
        </div>
        {candidates !== null && candidates.length === 0 && (
          <p className="text-xs text-stone-500">
            Nothing found — fill in the name and city above first, or type the details by hand.
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
        <div className="grid grid-cols-3 gap-2">
          <label className="block col-span-2">
            <span className="text-xs text-stone-600">Street address</span>
            <input
              name="address"
              maxLength={160}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </label>
          <label className="block">
            <span className="text-xs text-stone-600">Zip code</span>
            <input
              name="zip"
              maxLength={12}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-stone-600">Phone</span>
            <input
              name="phone"
              maxLength={30}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </label>
          <label className="block">
            <span className="text-xs text-stone-600">Website</span>
            <input
              name="website"
              maxLength={120}
              placeholder="example.com"
              className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-stone-600">Opening hours</span>
          <input
            name="hours"
            maxLength={200}
            placeholder="e.g. Sun–Thu 9:00–22:00, Fri 9:00–14:00"
            className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </label>
      </div>
      <input type="hidden" name="lat" />
      <input type="hidden" name="lng" />

      <label className="block">
        <span className="text-sm font-medium">
          Price level <span className="text-stone-400 font-normal">(optional)</span>
        </span>
        <select
          name="priceLevel"
          defaultValue="0"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="0">Not sure</option>
          <option value="1">$ — cheap eats</option>
          <option value="2">$$ — moderate</option>
          <option value="3">$$$ — pricey</option>
          <option value="4">$$$$ — splurge</option>
        </select>
      </label>

      <details className="rounded-lg border border-stone-200 bg-stone-50/60 p-3">
        <summary className="text-sm font-medium cursor-pointer">
          Opening hours <span className="text-stone-400 font-normal">(optional)</span>
        </summary>
        <p className="mt-1 text-xs text-stone-500">
          Leave a day blank if it&apos;s closed. Times as 24-hour, e.g. 09:00 and 22:30. A closing
          time earlier than the opening time means it runs past midnight.
        </p>
        <div className="mt-2 space-y-1.5">
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
      </details>

      <fieldset>
        <legend className="text-sm font-medium">
          Features <span className="text-stone-400 font-normal">(optional — helps people find it)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <label
              key={t.slug}
              className="cursor-pointer text-xs border border-stone-300 rounded-full px-2.5 py-1.5 has-checked:bg-brand-700 has-checked:text-white has-checked:border-brand-700 hover:border-brand-600 select-none"
            >
              <input type="checkbox" name="tags" value={t.slug} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <details className="rounded-lg border border-stone-200 bg-stone-50/60 p-3">
        <summary className="text-sm font-medium cursor-pointer">
          Dietary details{" "}
          <span className="text-stone-400 font-normal">(kosher, halal, coeliac, vegan)</span>
        </summary>
        <p className="mt-1 text-xs text-stone-500">
          The specifics people actually need — a generic &ldquo;kosher&rdquo; tag doesn&apos;t help
          someone who keeps cholov yisroel.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DIET_STANDARDS.map((s) => (
            <label
              key={s.slug}
              title={s.hint}
              className="cursor-pointer text-xs border border-stone-300 rounded-full px-2.5 py-1.5 has-checked:bg-brand-700 has-checked:text-white has-checked:border-brand-700 hover:border-brand-600 select-none bg-white"
            >
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
            className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <datalist id="certifier-options">
            {CERTIFIERS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </details>

      <label className="block">
        <span className="text-sm font-medium">
          Description <span className="text-stone-400 font-normal">(optional)</span>
        </span>
        <textarea
          name="description"
          rows={3}
          maxLength={1000}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-700 text-white py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Adding…" : "Add business"}
      </button>
    </form>
  );
}
