import { csvImportedItems } from "@/lib/csv-inventory-import";

export type Apparatus = {
  id: number;
  name: string;
  type: string;
  stationNumber: string;
  isReserve: boolean;
  status: string;
  notes: string;
  compartmentCount: number;
  itemCount: number;
};

export type Compartment = {
  id: number;
  apparatusId: number;
  name: string;
  compartmentType: string;
  sortOrder: number;
  notes: string;
};

export type InventoryItem = {
  id: number;
  apparatusId: number;
  compartmentId: number;
  name: string;
  equipmentType: string;
  equipmentId: string;
  serialNumber: string;
  quantity: number;
  make: string;
  model: string;
  description: string;
  notes: string;
  status: string;
  createdBy: string;
};

export type ApparatusDetail = Apparatus & {
  compartments: Compartment[];
  items: InventoryItem[];
};

export const equipmentTypes = [
  "Rope",
  "Hose",
  "SCBA",
  "Chainsaw",
  "Circular Saw",
  "Extrication Tools",
  "PPE",
  "Ladders",
  "Power Equipment",
  "Small Tools",
  "Portable Pump",
  "Extinguishers",
  "Electronics/Communications",
  "Other",
] as const;

export const itemStatuses = [
  "In Service",
  "Out of Service",
  "Needs Repair",
  "Missing",
  "Spare",
  "Retired",
] as const;

export const compartmentTypes = [
  "Cab",
  "EMS Cabinet",
  "Driver Side",
  "Officer Side",
  "Driver Side Wheel Well",
  "Officer Side Wheel Well",
  "Driver Side Walkway",
  "Officer Side Walkway",
  "Rear Driver Side",
  "Rear Center",
  "Rear Officer Side",
  "Ladder",
  "Bucket",
  "Bucket Box",
  "Other",
] as const;

export const templateDefinitions: Record<string, string[]> = {
  Engine: [
    "Cab",
    "EMS Cabinet",
    "Driver Side 1",
    "Officer Side 1",
    "Driver Side Wheel Well 1",
    "Officer Side Wheel Well 1",
    "Rear Driver Side",
    "Rear Center",
    "Rear Officer Side",
  ],
  "Engine With Walkway": [
    "Cab",
    "EMS Cabinet",
    "Driver Side 1",
    "Officer Side 1",
    "Driver Side Wheel Well 1",
    "Officer Side Wheel Well 1",
    "Driver Side Walkway",
    "Officer Side Walkway",
    "Rear Driver Side",
    "Rear Center",
    "Rear Officer Side",
  ],
  Truck: [
    "Cab",
    "EMS Cabinet",
    "Driver Side 1",
    "Officer Side 1",
    "Driver Side Wheel Well 1",
    "Officer Side Wheel Well 1",
    "Rear Driver Side",
    "Rear Center",
    "Rear Officer Side",
    "Ladder",
  ],
  "Truck 1": [
    "Cab",
    "EMS Cabinet",
    "Driver Side 1",
    "Officer Side 1",
    "Driver Side Wheel Well 1",
    "Officer Side Wheel Well 1",
    "Rear Driver Side",
    "Rear Center",
    "Rear Officer Side",
    "Ladder",
    "Driver Side Bucket Box",
    "Officer Side Bucket Box",
    "Bucket",
  ],
  "Blank/custom": [],
};

type ApparatusSeed = {
  name: string;
  type: string;
  stationNumber: string;
  template: keyof typeof templateDefinitions;
  isReserve: boolean;
};

const baseApparatusSeeds: ApparatusSeed[] = [
  { name: "Engine 1", type: "Engine", stationNumber: "1", template: "Engine", isReserve: false },
  { name: "Truck 1", type: "Truck 1", stationNumber: "1", template: "Truck 1", isReserve: false },
  { name: "Truck 3", type: "Truck", stationNumber: "1", template: "Truck", isReserve: false },
  { name: "Rescue 1", type: "Rescue", stationNumber: "1", template: "Blank/custom", isReserve: false },
  { name: "Battalion 1", type: "Command", stationNumber: "1", template: "Blank/custom", isReserve: false },
  { name: "Truck 2", type: "Truck", stationNumber: "2", template: "Truck", isReserve: false },
  { name: "Engine 10", type: "Engine", stationNumber: "2", template: "Engine With Walkway", isReserve: false },
  { name: "Engine 3", type: "Engine", stationNumber: "3", template: "Engine", isReserve: false },
  { name: "Engine 4", type: "Engine", stationNumber: "4", template: "Engine", isReserve: false },
  { name: "Engine 5", type: "Engine", stationNumber: "5", template: "Engine", isReserve: false },
  { name: "Engine 6", type: "Engine", stationNumber: "6", template: "Engine", isReserve: false },
  { name: "Engine 7", type: "Engine", stationNumber: "7", template: "Engine", isReserve: false },
  { name: "Engine 9", type: "Engine", stationNumber: "1", template: "Engine", isReserve: true },
];

function createImportedApparatusSeed(name: string): ApparatusSeed {
  const engineMatch = /^Engine (\d+)$/.exec(name);
  if (engineMatch) {
    return { name, type: "Engine", stationNumber: engineMatch[1], template: "Engine", isReserve: false };
  }
  if (name === "Station 1 Storage") {
    return { name, type: "Storage", stationNumber: "1", template: "Blank/custom", isReserve: false };
  }
  if (name === "Unassigned Equipment") {
    return { name, type: "Storage", stationNumber: "", template: "Blank/custom", isReserve: false };
  }
  return { name, type: "Specialty", stationNumber: "", template: "Blank/custom", isReserve: false };
}

const baseSeedNames = new Set(baseApparatusSeeds.map((seed) => seed.name));
const importedApparatusSeeds = [...new Set(csvImportedItems.map((item) => item.apparatusName))]
  .filter((name) => !baseSeedNames.has(name))
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  .map(createImportedApparatusSeed);

export const apparatusSeeds: ApparatusSeed[] = [...baseApparatusSeeds, ...importedApparatusSeeds];

const specialCompartments: Record<string, string[]> = {
  "Rescue 1": ["Cab", "EMS Cabinet", "Driver Side Rescue", "Officer Side Rescue", "Rear Equipment"],
  "Battalion 1": ["Cab", "Command Console", "Rear Storage"],
};

export function slugifyApparatus(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function inferCompartmentType(name: string) {
  const match = compartmentTypes.find((type) => name.startsWith(type));
  if (match) return match;
  if (name.includes("Bucket Box")) return "Bucket Box";
  if (name.includes("Bucket")) return "Bucket";
  return "Other";
}

export const startingDetails: ApparatusDetail[] = apparatusSeeds.map((seed, apparatusIndex) => {
  const id = apparatusIndex + 1;
  const importedItems = csvImportedItems.filter((item) => item.apparatusName === seed.name);
  const names = [...(specialCompartments[seed.name] ?? templateDefinitions[seed.template] ?? [])];
  for (const item of importedItems) {
    if (!names.includes(item.compartmentName)) names.push(item.compartmentName);
  }
  const compartments = names.map((name, index) => ({
    id: id * 100 + index + 1,
    apparatusId: id,
    name,
    compartmentType: inferCompartmentType(name),
    sortOrder: index + 1,
    notes: name === "Ladder" ? "Record all mounted and bedded ladder equipment here." : "",
  }));
  const items = importedItems
    .map((item, index) => {
      const compartment = compartments.find((entry) => entry.name === item.compartmentName);
      if (!compartment) return null;
      return {
        id: id * 1000 + index + 1,
        apparatusId: id,
        compartmentId: compartment.id,
        name: item.name,
        equipmentType: item.equipmentType,
        equipmentId: item.equipmentId,
        serialNumber: item.serialNumber,
        quantity: item.quantity,
        make: item.make,
        model: item.model,
        description: item.description.slice(0, 250),
        notes: item.notes.slice(0, 250),
        status: item.status,
        createdBy: "First Due import",
      };
    })
    .filter((item): item is InventoryItem => Boolean(item));

  return {
    id,
    name: seed.name,
    type: seed.type,
    stationNumber: seed.stationNumber,
    isReserve: seed.isReserve,
    status: "Active",
    notes: seed.isReserve ? "Reserve apparatus" : "",
    compartmentCount: compartments.length,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    compartments,
    items,
  };
});

export const startingApparatus: Apparatus[] = startingDetails.map((detail) => ({
  id: detail.id,
  name: detail.name,
  type: detail.type,
  stationNumber: detail.stationNumber,
  isReserve: detail.isReserve,
  status: detail.status,
  notes: detail.notes,
  compartmentCount: detail.compartmentCount,
  itemCount: detail.itemCount,
}));
