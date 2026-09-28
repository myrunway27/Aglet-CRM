import { PriceResults } from "@/components/PriceResults";

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return (
    <PriceResults
      catalogId={decodeURIComponent(id)}
      selection={{ finish: one("finish"), language: one("language"), grading: one("grading"), condition: one("condition") }}
    />
  );
}
