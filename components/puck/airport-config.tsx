"use client";

import type { Config, Data } from "@measured/puck";
import { AirportTimetable } from "@/components/public/airport-timetable";
import { useAirportContext } from "@/components/puck/airport-context";
import { puckConfig } from "@/components/puck/config";

const toBool = (value?: string) => value === "true";

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Math.random().toString(36).slice(2, 10)}`;
};

type AirportTimetableBlockProps = {
  allowPicker?: string;
};

function AirportTimetableBlock({ allowPicker }: AirportTimetableBlockProps) {
  const airport = useAirportContext();
  return (
    <AirportTimetable
      airports={[{ icao: airport.icao, name: airport.name }]}
      labels={airport.labels}
      allowPicker={toBool(allowPicker)}
    />
  );
}

export const airportPuckConfig: Config = {
  ...puckConfig,
  categories: {
    layout: {
      title: "Airport layout",
      components: ["AirportTimetable"],
      defaultExpanded: true,
    },
    ...puckConfig.categories,
  },
  components: {
    ...puckConfig.components,
    AirportTimetable: {
      fields: {
        allowPicker: {
          type: "select",
          options: [
            { label: "Fixed airport", value: "false" },
            { label: "Allow picker", value: "true" },
          ],
        },
      },
      defaultProps: {
        allowPicker: "false",
      },
      render: (props) => <AirportTimetableBlock {...props} />,
    },
  },
};

export const createDefaultAirportLayout = (): Data => ({
  root: { props: {} },
  content: [{ type: "AirportTimetable", props: { id: makeId(), allowPicker: "false" } }],
});
