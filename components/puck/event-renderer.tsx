"use client";

import { Render, type Data } from "@measured/puck";
import { eventPuckConfig } from "@/components/puck/event-config";
import { EventProvider, type EventLayoutData } from "@/components/puck/event-context";

type Props = {
  data: Data;
  context: EventLayoutData;
};

export function EventPuckRenderer({ data, context }: Props) {
  return (
    <EventProvider value={context}>
      <Render config={eventPuckConfig} data={data} />
    </EventProvider>
  );
}