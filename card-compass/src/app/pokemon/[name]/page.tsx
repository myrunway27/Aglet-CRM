import { SpeciesDetail } from "@/components/SpeciesBrowse";

export default async function SpeciesPage({ params }: PageProps<"/pokemon/[name]">) {
  const { name } = await params;
  return <SpeciesDetail name={decodeURIComponent(name).slice(0, 40)} />;
}
