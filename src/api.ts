import type { Apparatus, Compartment, Item } from './types';
const json = async <T>(path:string, init?:RequestInit): Promise<T> => { const r = await fetch(path,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}}); if(!r.ok) throw new Error(await r.text()); return r.status===204 ? undefined as T : r.json(); };
export const api = {
  apparatus: () => json<Apparatus[]>('/api/apparatus'),
  apparatusOne: (id:string|number) => json<Apparatus>(`/api/apparatus/${id}`),
  createApparatus: (body:unknown) => json<Apparatus>('/api/apparatus',{method:'POST',body:JSON.stringify(body)}),
  updateApparatus: (id:number, body:unknown) => json<Apparatus>(`/api/apparatus/${id}`,{method:'PUT',body:JSON.stringify(body)}),
  deleteApparatus: (id:number) => json<void>(`/api/apparatus/${id}`,{method:'DELETE'}),
  compartments: (id:string|number) => json<Compartment[]>(`/api/apparatus/${id}/compartments`),
  createCompartment: (id:number, body:unknown) => json<Compartment>(`/api/apparatus/${id}/compartments`,{method:'POST',body:JSON.stringify(body)}),
  updateCompartment: (id:number, body:unknown) => json<Compartment>(`/api/compartments/${id}`,{method:'PUT',body:JSON.stringify(body)}),
  deleteCompartment: (id:number) => json<void>(`/api/compartments/${id}`,{method:'DELETE'}),
  items: (id:string|number) => json<Item[]>(`/api/apparatus/${id}/items`),
  createItem: (body:unknown) => json<Item>('/api/items',{method:'POST',body:JSON.stringify(body)}),
  updateItem: (id:number, body:unknown) => json<Item>(`/api/items/${id}`,{method:'PUT',body:JSON.stringify(body)}),
  deleteItem: (id:number) => json<void>(`/api/items/${id}`,{method:'DELETE'}),
  moveItem: (id:number, body:unknown) => json<Item>(`/api/items/${id}/move`,{method:'POST',body:JSON.stringify(body)})
};
