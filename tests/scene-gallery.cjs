const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.style={};this.events={};this.hidden=false;this.parentNode=null;this.textContent=''}
  append(...items){for(const item of items){if(item.parentNode)item.parentNode.children=item.parentNode.children.filter(x=>x!==item);item.parentNode=this;this.children.push(item)}}
  replaceChildren(...items){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...items)}
  setAttribute(k,v){this[k]=v}
  removeAttribute(k){delete this[k]}
  addEventListener(k,f){this.events[k]=f}
}
const ids=['20261125220000-1111111111111111','20261125210000-2222222222222222'];
const rows=ids.map((id,i)=>({id,created:'2026-11-25T'+(22-i)+':00:00+02:00',zone:'Europe/Kyiv',city:'Киев',news:null}));
let fetches=0;
const box={window:{},document:{createElement:t=>new Element(t)},indexedDB:{open(){throw Error('unavailable')}},
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Intl,Date,WeakMap,console,
  fetch:async url=>{fetches++;return {ok:true,json:async()=>({scenes:rows}),headers:{get:()=> 'image/webp'},blob:async()=>({size:12})}}};
vm.runInNewContext(fs.readFileSync('public/preview/scenes.js','utf8'),box);
(async()=>{
 const container=new Element('div'),refresh=new Element('button');refresh.textContent='Обновить';
 await box.window.mountPulseScenes(container,false,refresh);
 const root=container.children[0],controls=root.children[3],[previous,next]=controls.children;
 assert.equal(controls.children[2],refresh);
 assert.equal(refresh.parentNode,previous.parentNode);
 assert.equal(next.hidden,true);assert.equal(next.style.display,'none');assert.equal(previous.hidden,false);
 previous.onclick();await new Promise(setImmediate);
 assert.equal(previous.hidden,true);assert.equal(next.hidden,false);
 next.onclick();await new Promise(setImmediate);
 assert.equal(next.hidden,true);assert.equal(previous.hidden,false);
 const before=fetches;
 container.replaceChildren(new Element('rates'));
 await box.window.mountPulseScenes(container,false,refresh);
 assert.equal(controls.children.filter(x=>x===refresh).length,1);
 assert.equal(container.children[0],root);
 assert.equal(fetches,before,'Returning from rates does not generate or fetch a new image');
 console.log('PASS Gallery: one button row, latest/oldest boundaries, return from rates');
})().catch(e=>{console.error(e);process.exitCode=1});
