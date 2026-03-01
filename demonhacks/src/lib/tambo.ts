import type { TamboComponent } from "@tambo-ai/react";
import { z } from "zod/v4";
import { PlaceResultList } from "@/src/components/tambo/PlaceResultList";
import { EventResultList } from "@/src/components/tambo/EventResultList";
import { QuestResultList } from "@/src/components/tambo/QuestResultList";

export const components: TamboComponent[] = [
  {
    name: "PlaceResultList",
    description:
      "Renders a list of place/venue cards with images, categories, and map navigation. Use when displaying search results for places, restaurants, parks, shops, etc.",
    component: PlaceResultList,
    propsSchema: z.object({
      places: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          lat: z.number(),
          lng: z.number(),
          category: z.string().nullable(),
          image_url: z.string().nullable(),
          address: z.string().nullable(),
          website_url: z.string().nullable(),
        }),
      ),
    }),
  },
  {
    name: "EventResultList",
    description:
      "Renders a list of event cards with dates, venues, and attendance counts. Use when displaying search results for events, concerts, festivals, etc.",
    component: EventResultList,
    propsSchema: z.object({
      events: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          lat: z.number(),
          lng: z.number(),
          venue_name: z.string().nullable(),
          starts_at: z.string(),
          ends_at: z.string(),
          attending_count: z.number(),
          image_url: z.string().nullable(),
        }),
      ),
    }),
  },
  {
    name: "QuestResultList",
    description:
      "Renders a list of quest cards with titles, descriptions, and XP rewards. Use when displaying available quests or exploration routes.",
    component: QuestResultList,
    propsSchema: z.object({
      quests: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          slug: z.string(),
          description: z.string().nullable(),
          xp_reward: z.number(),
          image_url: z.string().nullable(),
        }),
      ),
    }),
  },
];
