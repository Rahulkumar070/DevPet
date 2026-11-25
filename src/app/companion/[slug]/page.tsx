import { Metadata } from "next";
import connectDB from "@/lib/db/mongoose";
import { Companion } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import CompanionPublicClient from "./CompanionPublicClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  await connectDB();

  const companion = await Companion.findOne({ shareSlug: slug }).lean();

  if (!companion || !companion.isPublic) {
    return {
      title: "Companion Not Found - DevPet",
      description: "This companion doesn't exist or is private.",
    };
  }

  const owner = await User.findById(companion.userId).select("username").lean();
  const ownerUsername = owner?.username ?? "Developer";

  const title = `${companion.name} - ${companion.rarity} ${companion.species} | DevPet`;
  const description = `Meet ${companion.name}, a Level ${companion.level} ${companion.rarity} ${companion.species} owned by @${ownerUsername}. ${companion.battleWins} battle wins, ${companion.likes} likes!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "DevPet",
      images: [
        {
          url: `/api/og/companion/${slug}`,
          width: 1200,
          height: 630,
          alt: `${companion.name} the ${companion.species}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/companion/${slug}`],
    },
  };
}

export default async function CompanionPublicPage({ params }: Props) {
  const { slug } = await params;
  return <CompanionPublicClient slug={slug} />;
}
