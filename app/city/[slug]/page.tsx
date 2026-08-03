import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CITIES, getCity } from '@/lib/cities';
import { Explorer } from '@/components/Explorer';

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = getCity(slug);
  if (!city) return { title: 'City not found' };
  return {
    title: `${city.name} — City Explorer`,
    description: city.blurb,
  };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = getCity(slug);
  if (!city || !city.available) notFound();
  return <Explorer />;
}
