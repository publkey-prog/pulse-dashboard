'use strict';
window.PulseProjects=(()=>{
 const el=(tag,text,cls)=>Object.assign(document.createElement(tag),{textContent:text??'',className:cls||''});
 const date=v=>new Date(v).toLocaleString('ru-RU',{timeZone:'Europe/Kyiv',dateStyle:'short',timeStyle:'short'});
 function btn(label,fn){const b=el('button',label,'secondary');b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){if(e.message!=='Запрос отменён')alert(e.message)}finally{b.disabled=false}};return b}
 function group(parent,title){const s=el('section','','ext-section');s.append(el('h4',title));parent.append(s);return s}
 const request=(action,context)=>window.pulseAIRequest('./project-api.php',{action,context});
 const running=new Set();
 function open(p,create=false){
  const api=window.pulseProjectData,dialog=el('dialog','','ai-project-dialog');
  document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
  const reports=()=>p.aiReports||[];
  function frame(title){dialog.replaceChildren();const head=el('header');head.append(el('h2',title),btn('Закрыть',()=>dialog.close()));dialog.append(head,el('small',p.name));}
  function article(r){const box=group(dialog,'Экспертный доклад № '+r.number);box.append(el('small',date(r.date)+' · '+r.model));const body=el('article',r.text,'ai-report');body.tabIndex=0;box.append(body);if(r.forecast)body.append(el('h3','Прогноз'),el('p',r.forecast))}
  function archive(){frame('Архив докладов');[...reports()].reverse().forEach(r=>dialog.append(btn('№ '+r.number+' · '+date(r.date)+' · '+r.model,()=>{frame('Архивный доклад');article(r);dialog.append(btn('Назад',archive),btn('Удалить навсегда',()=>{if(confirm('Удалить доклад № '+r.number+' навсегда?')){p.aiReports=reports().filter(x=>x!==r);api.save();archive()}}))})));dialog.append(btn('Назад',main))}
  function main(){frame('ИИ проекта');const r=reports().at(-1);if(r)article(r);else dialog.append(el('p','Подготовьте первый доклад по проекту.'));
   dialog.append(btn(r?'Обновить доклад':'Создать доклад',generate),btn('Архив',archive));const map=group(dialog,'Карта проекта');
   const rows=api.map(p),progress=el('progress');progress.max=Math.max(1,rows.length);progress.value=rows.filter(t=>t.done).length;map.append(progress,el('small','Выполнено '+progress.value+' из '+rows.length));for(const t of rows){const row=btn((t.done?'✓ ':'○ ')+(t.aiCreated?'ИИ · ':'')+t.text,()=>{dialog.close();api.detail(t.id)});row.classList.add('ai-step');row.append(el('small',date(t.deadlineAt)+' · Фокус '+api.focus(t)+(t.aiHours?' · Прогноз '+t.aiHours+' ч':'')));map.append(row)}map.append(el('b','Дедлайн · '+date(p.deadlineAt)))}
  async function generate(){if(running.has(p.id))return;running.add(p.id);const status=el('p','Готовим доклад…');dialog.append(status);
   try{const ctx=api.context(p),r=await request('report',ctx);if(!api.enabled(p))throw Error('Проект изменён. Откройте его снова.');
    const items=Array.isArray(r.data.tasks)?r.data.tasks:[];if(!reports().length&&ctx.freeSlots>0&&!items.some(x=>x?.title&&x.description))throw Error('Не получен план задач. Повторите запрос.');
    api.apply(p,r,items);if(dialog.open)main();
   }finally{running.delete(p.id);status.remove()}}
  main();if(create)generate().catch(e=>{if(e.message!=='Запрос отменён')alert(e.message)})
 }
 function task(t,host){const api=window.pulseProjectData;const tips=t.aiTips||(t.aiTips=[]);let pos=tips.length-1;
  const section=group(host,'Советы ИИ'),line=el('small'),body=el('p');section.append(line,body);
  function step(n){pos=Math.min(tips.length-1,Math.max(0,pos+n));draw()}
  const prev=btn('‹',()=>step(-1)),next=btn('›',()=>step(1));
  const more=btn('Ещё совет',async()=>{const p=api.parent(t);if(!p?.aiHelp)return;
   const r=await request('tip',{project:{name:p.name,description:p.description},task:t,focus:api.focus(t)});
   if(!api.enabled(p)||api.parent(t)!==p)return;
   tips.push({text:r.data.tip,date:r.date});api.save();pos=tips.length-1;draw()
  });
  function draw(){const v=tips[pos];line.textContent=v?'Совет '+(pos+1)+' из '+tips.length+' · '+date(v.date):'';body.textContent=v?.text||'Запросите совет по текущему шагу.';prev.hidden=pos<=0;next.hidden=pos>=tips.length-1}
  section.append(prev,next,more);let start;section.ontouchstart=e=>{start=e.touches[0].clientX};section.ontouchend=e=>{const dx=e.changedTouches[0].clientX-start;if(Math.abs(dx)>48)step(dx>0?-1:1)};draw();
  const list=group(host,'Материалы ИИ');for(const m of t.aiMaterials||[]){const d=el('details');d.append(el('summary',m.title),el('p',m.body));if(/^https?:\/\//i.test(m.url)){const a=el('a','Открыть источник');a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';d.append(a)}list.append(d)}
 }
 return {open,task}
})();
