export type SetEntry = { weight: number; reps: number };
export type Exercise = { id: string; name: string };
export type Entry = { id: string; date: string; exerciseId: string; name: string; sets: SetEntry[]; createdAt: string };
export type State = { version: 1; exercises: Exercise[]; entries: Entry[]; rests: string[]; settings: { sound: boolean; name: string } };
export const initialState: State = { version: 1, exercises: [], entries: [], rests: [], settings: { sound: false, name: '旅人' } };
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function growth(s: State) {
 const xp = s.entries.reduce((n,e)=> n + e.sets.length*10 + (isPB(e,s.entries)?20:0),0);
 const level = 1 + Math.floor(xp/100);
 return { xp, level, progress: xp%100, rank: level>=15?'森の守り人':level>=8?'若木の騎士':level>=4?'木立の冒険者':'芽吹きの見習い' };
}
export function isPB(entry: Entry, all: Entry[]) {
 const score = Math.max(...entry.sets.map(x=>x.weight*x.reps),0);
 return score>0 && !all.some(e=>e.id!==entry.id && e.exerciseId===entry.exerciseId && (e.createdAt<entry.createdAt || (e.createdAt===entry.createdAt && e.id<entry.id)) && Math.max(...e.sets.map(x=>x.weight*x.reps),0)>=score);
}
export function weekDates(date = new Date()) { const start = new Date(date); start.setHours(0,0,0,0); start.setDate(start.getDate()-((start.getDay()+6)%7)); return Array.from({length:7},(_,i)=>{const d=new Date(start); d.setDate(d.getDate()+i);return localDate(d);}); }
export function parseBackup(raw: string): State {
 const s = JSON.parse(raw);
 if (!s || s.version!==1 || !Array.isArray(s.exercises)||!Array.isArray(s.entries)||!Array.isArray(s.rests)||!s.settings || typeof s.settings.name!=='string'||typeof s.settings.sound!=='boolean') throw Error('対応するバックアップではありません。');
 const dateOK=(x:unknown)=>typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && localDate(new Date(x+'T12:00:00'))===x;
 const ids = new Set<string>();
 for (const e of s.exercises) {if (!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||e.name.length>60) throw Error('種目データが不正です。'); ids.add(e.id);}
 const entryIds = new Set<string>();
 for (const e of s.entries) { if(!e||typeof e.id!=='string'||entryIds.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!ids.has(e.exerciseId)||!dateOK(e.date)||typeof e.createdAt!=='string'||!Number.isFinite(Date.parse(e.createdAt))||!Array.isArray(e.sets)||!e.sets.length||e.sets.some((x:SetEntry)=>!x||!Number.isFinite(x.weight)||x.weight<0||x.weight>2000||!Number.isInteger(x.reps)||x.reps<1||x.reps>10000)) throw Error('記録データが不正です。'); entryIds.add(e.id); }
 if(s.rests.some((x:unknown)=>!dateOK(x))) throw Error('休息日データが不正です。');
 return s as State;
}
