"use client";

import { Render, type Data } from "@measured/puck";
import { puckConfig } from "@/components/puck/config";

type Props = {
  data: Data;
};

export function PuckRenderer({ data }: Props) {
  return <Render config={puckConfig} data={data} />;
}
