'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const api = window.pulseScheduleData;
  const byId = id => document.getElementById(id);
  const names = ['На сегодня','Активность','Доход','Расписание'];
  const firstKey = 'pulse_preview_home_first';
  const planKey = 'pulse_preview_day_schedule';
  const first = () => localStorage.getItem(firstKey) === 'schedule' ? 3 : 0;
  const schedule = document.createElement('section');
  schedule.className = 'panel';
  schedule.innerHTML = '<div class="panel-title"><h2>Расписание</h2><span class="plan-clock"></span></div><div class="plan-modes"><button class="secondary">Авто</button><button class="secondary">ИИ</button></div><div class="plan-wheel" aria-label="Расписание дня"></div><div class="plan-task-details" hidden><div class="plan-description"><strong>Описание задачи:</strong><div class="plan-body"></div><small class="plan-project"></small></div><div class="plan-deadline"><span></span> <b></b></div></div><p class="plan-info"></p><small role="status"></small>';
  const cards = [byId('taskList').closest('.panel'),byId('activityChart').closest('.panel'),byId('pulseIncome'),schedule];
  const deck = document.createElement('div');
  deck.className = 'pulse-deck';
  cards[0].before(deck);
  const dots = document.createElement('div');
  dots.className = 'deck-dots';
  deck.after(dots);
  let page = first();
  function turn(index) {
    page = (index+4)%4;
    cards.forEach((card,i) => {
      const distance = (i-page+4)%4;
      card.classList.remove('deck-current','deck-left','deck-right','deck-away');
      card.classList.add(['deck-current','deck-right','deck-away','deck-left'][distance]);
      card.inert = distance !== 0;
      dots.children[i].setAttribute('aria-current',String(!distance));
    });
    if(page===3) update(true);
  }
  cards.forEach((card,i) => {
    deck.append(card);card.classList.add('deck-card');
    const dot = document.createElement('button');
    dot.setAttribute('aria-label',names[i]);dot.onclick = () => turn(i);dots.append(dot);
  });
  let gesture, suppressUntil = 0;
  deck.addEventListener('touchstart',e => {gesture=e.touches.length===1?e.touches[0]:null},{passive:true});
  deck.addEventListener('touchcancel',()=>{gesture=null});
  deck.addEventListener('touchend',e=>{
    if(!gesture)return;
    const dx=e.changedTouches[0].clientX-gesture.clientX,dy=e.changedTouches[0].clientY-gesture.clientY;
    gesture=null;
    if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)*1.45){
      suppressUntil=Date.now()+350;turn(page+(dx>0?1:-1));
    }
  },{passive:true});
  deck.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  const preference=document.createElement('label');
  preference.innerHTML='Первый блок на главной <select><option value="tasks">На сегодня</option><option value="schedule">Расписание</option></select>';
  byId('extSettingsCard').append(preference);
  preference.lastChild.value=first()===3?'schedule':'tasks';
  preference.lastChild.onchange=e=>{localStorage.setItem(firstKey,e.target.value);turn(first())};

  const wheel=schedule.querySelector('.plan-wheel'),info=schedule.querySelector('.plan-info'),status=schedule.querySelector('[role=status]');
  const [auto,ai]=schedule.querySelectorAll('.plan-modes button');
  const minute=60000, pause=20;
  const time=ms=>new Date(ms).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const day=()=>new Date().toLocaleDateString('sv-SE');
  let plan, drawn='', previous=-2, pending=0;
  try{plan=JSON.parse(localStorage.getItem(planKey))}catch{}
  function build(order=api.candidates(),advice={},mode='auto'){
    const [start,end]=api.hours().map(h=>new Date(day()+'T'+h).getTime());
    let cursor=Math.max(start,Math.floor(Date.now()/minute)*minute);
    const minutes=Math.max(0,Math.floor((end-cursor)/minute));
    const eligible=order.slice(0,Math.floor((minutes+pause)/(pause+1)));
    let available=minutes-Math.max(0,eligible.length-1)*pause;
    const weight=t=>Math.max(1,Number(t.estimateMinutes)||1);
    let weights=eligible.reduce((n,t)=>n+weight(t),0);
    const slots=[];
    eligible.forEach((t,i)=>{
      const length=Math.min(available-(eligible.length-i-1),Math.max(1,Math.floor(available*weight(t)/weights)));
      const until=cursor+length*minute;
      slots.push({id:t.id,from:cursor,to:until,advice:advice[t.id]||''});
      cursor=until;available-=length;weights-=weight(t);
      if(i+1<eligible.length){slots.push({from:cursor,to:cursor+pause*minute});cursor+=pause*minute}
    });
    return {day:day(),mode,slots,omitted:order.length-eligible.length};
  }
  function save(value){plan=value;localStorage.setItem(planKey,JSON.stringify(plan));drawn='';update(true)}
  function update(force=false){
    if(!plan || plan.day!==day() || !Array.isArray(plan.slots)){
      plan=build();localStorage.setItem(planKey,JSON.stringify(plan));drawn='';
    }
    if(page!==3)return;
    const now=Date.now(), slots=plan.slots;
    const active=slots.findIndex(s=>s.from<=now && now<s.to);
    const stamp=JSON.stringify(slots.map(s=>[s.from,s.to,s.id,s.id!=null?api.task(s.id)?.text:null]));
    const changed=drawn!==stamp;
    if(changed){
      wheel.replaceChildren();
      for(const slot of slots){
        const b=document.createElement('button'),task=slot.id!=null?api.task(slot.id):null;
        b.textContent=time(slot.from)+'　'+(task?.text||(slot.id!=null?'Задача удалена':'Отдых · 20 мин'));
        b.setAttribute('aria-disabled',String(!task));
        if(task)b.onclick=()=>api.openTask(task.id);
        wheel.append(b);
      }
      drawn=stamp;
    }
    if(force||changed||active!==previous){
      Array.from(wheel.children).forEach((b,i)=>b.classList.toggle('current',i===active));
      const b=wheel.children[Math.max(0,active)];
      if(b)wheel.scrollTop=37*Math.max(0,active);
    }
    previous=active;wheel.hidden=!slots.length;
    auto.setAttribute('aria-pressed',String(plan.mode==='auto'));ai.setAttribute('aria-pressed',String(plan.mode==='ai'));
    schedule.querySelector('.plan-clock').textContent=time(now);
    const slot=slots[active],task=slot?.id!=null?api.task(slot.id):null;
    let details='На сегодня нет интервалов.';
    if(!slot && slots.length)details=now<slots[0].from?'Начало в '+time(slots[0].from):'Расписание на сегодня завершено.';
    if(slot && slot.id==null)details='Перерыв до '+time(slot.to);
    if(slot && slot.id!=null && !task)details='Задача удалена. Обновите расписание кнопкой «Авто».';
    const taskDetails=schedule.querySelector('.plan-task-details');
    taskDetails.hidden=!task || plan.mode==='ai';
    if(task && plan.mode==='ai') details=slot.advice;
    if(!taskDetails.hidden){
      details='';
      taskDetails.querySelector('.plan-body').textContent=task.description || task.text;
      const project=api.project(task.projectId);
      taskDetails.querySelector('.plan-project').textContent=project ? 'Проект · '+project : '';
      const deadline=taskDetails.querySelector('.plan-deadline');
      const seconds=Math.floor((Date.parse(task.deadlineAt)-now)/1000);
      deadline.hidden=!Number.isFinite(seconds);
      if(!deadline.hidden){
        const n=Math.abs(seconds);
        deadline.classList.toggle('overdue', seconds<0);
        deadline.querySelector('span').textContent=seconds<0 ? 'Срочно разберись' : 'Скоро, очень скоро:';
        deadline.querySelector('b').textContent=[Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(x=>String(x).padStart(2,'0')).join(':');
      }
    }
    info.textContent=[details,plan.omitted?'За пределами рабочего дня: '+plan.omitted:''].filter(Boolean).join('\n');
    info.hidden=!info.textContent;
  }
  auto.onclick=()=>{pending++;ai.disabled=false;status.textContent='';save(build())};
  const dialog=document.createElement('dialog');dialog.className='plan-dialog';
  dialog.innerHTML='<form method="dialog"><h3>План с ИИ</h3><p>Pulse отправит в OpenAI задачи дня, описания проектов и сведения о фокусе. Для доступа введите код песочницы.</p><label>Код песочницы<input type="password" autocomplete="off" maxlength="256"></label><div class="actions"><button value="cancel">Отмена</button><button class="primary" value="plan">Составить план</button></div></form>';
  document.body.append(dialog);
  ai.onclick=()=>{
    if(!navigator.onLine){auto.click();status.textContent='Нет связи. Используется локальный план.';return}
    dialog.returnValue='';dialog.showModal();
  };
  dialog.onclose=async()=>{
    const field=dialog.querySelector('input'),code=field.value.trim();field.value='';
    if(dialog.returnValue!=='plan')return;
    if(!code){status.textContent='Введите код песочницы.';return}
    const items=api.candidates(),request=++pending,requestDay=day();
    if(!items.length){save(build());status.textContent='Нет задач для планирования.';return}
    ai.disabled=true;status.textContent='ИИ составляет расписание…';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
    try{
      const result=await fetch('./schedule-api.php',{
        method:'POST',signal:controller.signal,cache:'no-store',
        headers:{'Content-Type':'application/json','X-Pulse-Schedule-Code':code},
        body:JSON.stringify({hours:api.hours(),now:new Date().toISOString(),...api.context(),tasks:items.map(t=>({id:t.id,name:t.text,description:t.description,project:api.project(t.projectId),deadline:t.deadlineAt,priority:t.starred}))})
      });
      const data=await result.json();
      if(!result.ok){
        const errors={
          schedule_access_required:'неверный код или доступ ещё не настроен',
          schedule_unconfigured:'серверный ключ недоступен',
          schedule_invalid_input:'данные расписания не приняты',
          openai_access_denied:'ключ OpenAI отклонён',
          openai_limit:'достигнут лимит OpenAI'
        };
        throw Error(errors[data.error]||'ошибка сервера');
      }
      const answer=data.tasks, lookup=new Map(items.map(t=>[String(t.id),t])),order=[],tips=Object.create(null);
      for(const row of answer){const id=String(row.id),task=lookup.get(id);if(!task||typeof row.advice!=='string'||!row.advice.trim())throw Error('формат ответа');order.push(task);tips[id]=row.advice;lookup.delete(id)}
      if(lookup.size)throw Error('неполный план');
      if(request===pending && day()===requestDay){save(build(order,tips,'ai'));status.textContent='План ИИ готов.'}
    }catch(error){if(request===pending && day()===requestDay){save(build());status.textContent='ИИ недоступен ('+error.message+'). Составлен локальный план.'}}
    finally{clearTimeout(timeout);if(request===pending)ai.disabled=false}
  };
  turn(page);setInterval(()=>{if(!document.hidden && !byId('homeView').classList.contains('hidden'))update()},1000);
});
