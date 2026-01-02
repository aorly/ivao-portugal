"use client";

import { Render, type Data } from "@measured/puck";
import { airportPuckConfig } from "@/components/puck/airport-config";
import { AirportProvider, type AirportLayoutData } from "@/components/puck/airport-context";

type Props = {
  data: Data;
  context: AirportLayoutData;
};

export function AirportPuckRenderer({ data, context }: Props) {
  return (
    <AirportProvider value={context}>
      <Render config={airportPuckConfig} data={data} />
    </AirportProvider>
  );
}
