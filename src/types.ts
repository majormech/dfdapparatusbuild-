export type Apparatus = { id:number; name:string; type:string; station_number:string; is_reserve:number; status:string; notes?:string; compartment_count:number; item_count:number };
export type Compartment = { id:number; apparatus_id:number; name:string; compartment_type:string; sort_order:number; notes?:string };
export type Item = { id:number; apparatus_id:number; compartment_id:number; name:string; equipment_type?:string; equipment_id?:string; serial_number?:string; quantity:number; make?:string; model?:string; description?:string; notes?:string; status:string };
export const APPARATUS_TEMPLATES = ['Engine','Engine With Walkway','Truck','Truck 1','Blank/custom'];
export const COMPARTMENT_TYPES = ['Cab','EMS Cabinet','Driver Side','Officer Side','Driver Side Wheel Well','Officer Side Wheel Well','Driver Side Walkway','Officer Side Walkway','Rear Driver Side','Rear Center','Rear Officer Side','Ladder','Bucket','Bucket Box','Other'];
export const EQUIPMENT_TYPES = ['Rope','Hose','SCBA','Chainsaw','Circular Saw','Extrication Tools','PPE','Ladders','Power Equipment','Small Tools','Portable Pump','Extinguishers','Electronics/Communications','Other'];
export const STATUSES = ['In Service','Out of Service','Needs Repair','Missing','Spare','Retired'];
