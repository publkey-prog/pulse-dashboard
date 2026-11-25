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
  schedule.innerHTML = '<div class="panel-title"><h2>Расписание</h2></div><div class="plan-modes"><button class="secondary">Новый день</button><button class="secondary">Курс валют</button></div><div class="day-content"></div>';
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
    if(page===3 && !opened) show(false);
  }
  cards.forEach((card,i) => {
    deck.append(card);card.classList.add('deck-card');
    const dot = document.createElement('button');
    dot.setAttribute('aria-label',names[i]);dot.onclick = () => turn(i);dots.append(dot);
  });
  let gesture, suppressUntil = 0;
  deck.addEventListener('touchstart',e => {gesture=!e.target.closest(".day-content") && e.touches.length===1?e.touches[0]:null},{passive:true});
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


  const [day,rates]=schedule.querySelectorAll('.plan-modes button');
  const content=schedule.querySelector('.day-content');let opened=false,generating=false;
  async function show(generate){
    if(generating)return;
    opened=true;day.setAttribute('aria-pressed','true');rates.setAttribute('aria-pressed','false');
    generating=generate;day.disabled=generate;rates.disabled=generate;
    try{await window.mountPulseScenes(content,generate)}finally{generating=false;day.disabled=false;rates.disabled=false}
  }
  day.onclick=()=>show(true);
  rates.onclick=()=>{if(rates.getAttribute('aria-pressed')==='true'){show(false);return}opened=true;day.setAttribute('aria-pressed','false');rates.setAttribute('aria-pressed','true');window.mountPulseRates(content)};
  turn(page);
});
