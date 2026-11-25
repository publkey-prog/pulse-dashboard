(() => {
  'use strict';
  const endpoint = 'scenes.php';
  const localKey = 'pulse-preview-day-scene-v1';
  const idPattern = /^\d{14}-[a-f0-9]{16}$/;
  const kyiv = {city:'Киев',country:'UA',lat:50.45,lon:30.52,zone:'Europe/Kyiv'};
  const viewers = new WeakMap();
  let generating = null;
  function element(tag,text) {
    const item = document.createElement(tag);
    if (text != null) item.textContent = text;
    return item;
  }
  async function readLocation() {
    if (!navigator.geolocation) return kyiv;
    try {
      const pos = await new Promise((resolve,reject) => navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:6000,maximumAge:300000}));
      const lat=Math.round(pos.coords.latitude*100)/100, lon=Math.round(pos.coords.longitude*100)/100;
      const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),6000);
      let detail;
      try {
        const query=new URLSearchParams({latitude:lat,longitude:lon,localityLanguage:'uk'});
        const res=await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?'+query,{signal:controller.signal,referrerPolicy:'no-referrer',credentials:'omit'});
        if (!res.ok) return kyiv;
        detail=await res.json();
      } finally { clearTimeout(timer); }
      const city=detail.city || detail.locality;
      if (!city) return kyiv;
      return {lat,lon,city,country:detail.countryCode,zone:Intl.DateTimeFormat().resolvedOptions().timeZone};
    } catch { return kyiv; }
  }
  function localScene(mode, value) {
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(localKey,1);
      req.onupgradeneeded=()=>req.result.createObjectStore('image');
      req.onerror=()=>reject(req.error);
      req.onsuccess=()=>{
        const db=req.result, tx=db.transaction('image',mode==='put'?'readwrite':'readonly');
        const store=tx.objectStore('image'), op=mode==='put'?store.put(value,'latest'):store.get('latest');
        tx.oncomplete=()=>{db.close();resolve(op.result)};
        tx.onabort=()=>{db.close();reject(tx.error)};
      };
    });
  }
  function weather(s) {
    if (s.weatherCode==null && s.temperature==null) return 'погода недоступна';
    const c=s.weatherCode;
    const snow=[71,73,75,77,85,86], thunder=[95,96,99];
    const symbol=thunder.includes(c)?'⛈️':snow.includes(c)?'🌨️':c>=51?'🌧️':s.wind>=30?'🌬️':c>=45?'🌫️':c>=2?'☁️':s.isDay===0?'🌙':'☀️';
    return symbol+(s.temperature==null?'':' '+(s.temperature>0?'+':'')+Math.round(s.temperature)+' °C');
  }
  async function apiRead(params) {
    const res=await fetch(endpoint+(params?'?'+params:''),{credentials:'same-origin',cache:'no-store'});
    if (!res.ok) throw Object.assign(new Error('Не удалось загрузить сцену'),{status:res.status});
    return res;
  }
  async function newScene() {
    const location=await readLocation();
    const requestId=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
    const result=await window.pulseAIRequest(endpoint,{requestId,location,context:window.pulseDayContext()});
    if (!idPattern.test(result?.scene?.id || '')) throw new Error('Сервер не вернул сцену');
    return result.scene;
  }
  window.mountPulseScenes=async function(container,generate=false) {
    let v=viewers.get(container);
    if (!v) {
      const root=element('div'), meta=element('p'), area=element('div'), picture=element('img'), headline=element('a');
      const controls=element('div'), previous=element('button','← Раньше'), next=element('button','Позже →'), status=element('small'), retry=element('button','Повторить');
      picture.alt='Сцена дня'; picture.hidden=true; picture.style.cssText='width:100%;height:auto;border-radius:12px;vertical-align:middle;touch-action:pan-y';
      controls.style.cssText='display:flex;gap:.6rem;margin:.55rem 0';
      headline.style.cssText='color:inherit;display:block'; headline.target='_blank'; headline.rel='noopener noreferrer';
      [previous,next,retry].forEach(b=>{b.type='button';b.className='secondary'});
      status.setAttribute('role','status'); retry.hidden=true; headline.hidden=true;
      controls.append(previous,next); area.append(picture); root.append(meta,area,headline,controls,status,retry);
      v={root,meta,picture,headline,previous,next,status,retry,rows:[],pos:-1,url:'',revision:0,tried:false};
      viewers.set(container,v);
      function updateControls() {
        previous.disabled=v.pos<0 || v.pos>=v.rows.length-1;
        next.disabled=v.pos<=0;
        controls.style.display=v.rows.length>1?'flex':'none';
      }
      v.draw=(scene,blob)=>{
        const old=v.url;
        v.url=URL.createObjectURL(blob);picture.src=v.url;picture.hidden=false;
        if (old) URL.revokeObjectURL(old);
        v.pos=v.rows.findIndex(row=>row.id===scene.id);
        const stamp=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:scene.zone}).format(new Date(scene.created));
        meta.textContent=stamp+' · '+scene.city+' · '+weather(scene);
        const news=scene.news;
        headline.textContent=news?.title||'';
        headline.hidden=!news?.url;
        headline.style.display=news?.url?'block':'none';
        if (news?.url && news.url.startsWith('https://news.google.com/')) headline.href=news.url;else headline.removeAttribute('href');
        status.textContent='';retry.hidden=true;updateControls();
      };
      v.fail=(msg,action)=>{
        status.textContent=msg;
        retry.hidden=!action;retry.onclick=action || null;updateControls();
      };
      v.load=async(index,isLatest)=>{
        const row=v.rows[index]; if (!row || !idPattern.test(row.id)) return;
        const serial=++v.revision;
        try {
          const res=await apiRead('image='+encodeURIComponent(row.id));
          if (!(res.headers.get('Content-Type')||'').startsWith('image/webp')) throw new Error();
          const blob=await res.blob();
          if (!blob.size || serial!==v.revision) return;
          v.draw(row,blob);
          if (isLatest) await localScene('put',{scene:row,blob}).catch(()=>{});
        } catch { if (serial===v.revision) v.fail('Не удалось загрузить сцену.',()=>v.load(index,isLatest)); }
      };
      v.sync=async()=>{
        if (!v.url) {
          try {
            const cached=await localScene('get');
            if (cached?.scene && cached.blob && !v.url) { v.rows=[cached.scene];v.draw(cached.scene,cached.blob); }
          } catch {}
        }
        try {
          const data=await (await apiRead('')).json();
          if (!Array.isArray(data.scenes)) throw new Error();
          v.rows=data.scenes;
          if (v.rows.length) await v.load(0,true);
          else v.fail(v.url?'На устройстве сохранена последняя сцена.':'Нажми «Обновить», чтобы создать первую сцену.');
        } catch (err) {
          if (!v.url && (err.status===401 || err.status===403)) v.fail('Нажми «Обновить», чтобы создать первую сцену.');
          else v.fail('Архив сейчас недоступен.',v.sync);
        }
      };
      previous.onclick=()=>{if (!previous.disabled) v.load(v.pos+1,false)};
      next.onclick=()=>{if (!next.disabled) v.load(v.pos-1,v.pos===1)};
      let touch;
      area.addEventListener('touchstart',e=>{e.stopPropagation();touch=e.touches.length===1?e.touches[0]:null},{passive:true});
      area.addEventListener('touchcancel',e=>{e.stopPropagation();touch=null},{passive:true});
      area.addEventListener('touchend',e=>{
        e.stopPropagation();
        if (!touch) return;
        const dx=e.changedTouches[0].clientX-touch.clientX,dy=e.changedTouches[0].clientY-touch.clientY;touch=null;
        if (Math.abs(dx)>35 && Math.abs(dx)>Math.abs(dy)*1.3) (dx>0?previous:next).click();
      },{passive:true});
      updateControls();
    }
    if (v.root.parentNode!==container) container.replaceChildren(v.root);
    if (!v.tried) { v.tried=true;v.initial=v.sync(); }
    await v.initial;
    if (!generate || generating) return;
    v.fail('Создаём сцену дня…');
    generating=newScene();
    try {
      const scene=await generating;
      v.rows=[scene,...v.rows.filter(row=>row.id!==scene.id)];
      await v.load(0,true);
    } catch (error) {
      v.fail(error?.name==='AbortError'?'Создание отменено.':(error?.message || 'Не удалось создать сцену.'));
    } finally {generating=null}
  };
})();
