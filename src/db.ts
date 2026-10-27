import { openDB } from 'idb';
import { initialState, type State } from './model';
const database = () => openDB('komorebi-training',1,{upgrade(db){db.createObjectStore('journal');}});
export async function load(): Promise<State> {const db=await database(); return (await db.get('journal','state')) ?? structuredClone(initialState);}
export async function save(state: State) {const db=await database(); await db.put('journal',state,'state');}
