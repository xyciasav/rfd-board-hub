import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcilePrograms,syncProgramToWebsite,removeProgramFromWebsite} from '../program-sync.js';

test('existing website and Hub programs merge by title without duplication',()=>{
 const db={programs:[{id:'hub1',title:'Rage Clean',description:'Hub description',documents:[{id:'doc1'}]}],websiteContent:{draft:{programs:[{id:'site1',title:'Rage Clean',subtitle:'Clean together',body:'Old website copy',image:'/clean.webp',visible:true,order:10}]}}};
 assert.equal(reconcilePrograms(db),true);
 assert.equal(db.programs.length,1);assert.equal(db.websiteContent.draft.programs.length,1);
 assert.equal(db.programs[0].websiteId,'site1');assert.equal(db.programs[0].documents.length,1);
 assert.equal(db.websiteContent.draft.programs[0].body,'Hub description');assert.equal(db.websiteContent.draft.programs[0].image,'/clean.webp');
});

test('program changes update the website draft and deletion removes only the draft copy',()=>{
 const program={id:'hub2',title:'Instrument Closet',description:'Share instruments.',subtitle:'Music within reach',visible:true,documents:[]},db={websiteContent:{draft:{programs:[]}}};
 syncProgramToWebsite(db,program);assert.equal(db.websiteContent.draft.programs[0].title,'Instrument Closet');assert.equal(db.websiteContent.draft.programs[0].body,'Share instruments.');
 removeProgramFromWebsite(db,program);assert.equal(db.websiteContent.draft.programs.length,0);assert.equal(program.title,'Instrument Closet');
});
