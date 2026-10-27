import { describe, it, expect } from 'vitest';
import { growth, initialState, parseBackup, weekDates, type State } from '../src/model';
const state:State={...initialState,exercises:[{id:'squat',name:'スクワット'}],entries:[{id:'1',date:'2026-10-26',exerciseId:'squat',name:'スクワット',sets:[{weight:20,reps:10},{weight:25,reps:8}],createdAt:'2026-10-26T10:00:00Z'}]};
describe('training progression and backup safety',()=>{
 it('rewards sets and PB once, but not a repeated equal performance',()=>{expect(growth(state).xp).toBe(40);expect(growth({...state,entries:[...state.entries,{...state.entries[0],id:'2',createdAt:'2026-10-27T10:00:00Z'}]}).xp).toBe(60);});
 it('never penalizes rest days or inactivity',()=>{expect(growth({...state,rests:['2026-10-27']})).toEqual(growth(state));});
 it('round-trips all local data',()=>{expect(parseBackup(JSON.stringify(state))).toEqual(state);});
 it('rejects invalid, dangling, duplicate and corrupt records',()=>{for(const bad of [{...state,version:2},{...state,entries:[{...state.entries[0],exerciseId:'missing'}]},{...state,entries:[{...state.entries[0],sets:[{weight:-1,reps:10}]}]},{...state,rests:['2026-02-31']},{...state,entries:[...state.entries,...state.entries]}])expect(()=>parseBackup(JSON.stringify(bad))).toThrow();});
 it('starts weeks on Monday across year boundaries',()=>{expect(weekDates(new Date(2027,0,3))).toEqual(['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);});
});
