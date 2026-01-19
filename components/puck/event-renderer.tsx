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
      <div className="space-y-6 [&>div>section]:mt-6 [&>div>section:first-child]:mt-0">
        <Render config={eventPuckConfig} data={data} />
      </div>
    </EventProvider>
  );
}
