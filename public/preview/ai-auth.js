'use strict';
window.pulseAIRequest=async function(url,body){
 async function post(path,data){return fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Pulse-Request':'1'},body:JSON.stringify(data)})}
 async function read(r){const d=await r.json();if(!r.ok)throw Error(d.error||'Ошибка сервера');return d}
 let r=await post(url,body);
 if(r.status===401){
  const credentials=await new Promise((resolve,reject)=>{
   const dialog=document.createElement('dialog');dialog.className='plan-dialog';
   dialog.innerHTML='<form method="dialog"><h3>Доступ к ИИ</h3><input type="password" aria-label="Пароль ИИ" autocomplete="current-password" required><label><input type="checkbox" style="width:auto"> Запомнить на этом устройстве на 7 дней</label><div class="actions"><button type="button" class="secondary">Отмена</button><button class="primary">Продолжить</button></div></form>';
   document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
   dialog.querySelector('form').onsubmit=e=>{e.preventDefault();resolve({action:'login',code:dialog.querySelector('[type=password]').value,remember:dialog.querySelector('[type=checkbox]').checked});dialog.close()};
   dialog.onclose=()=>{dialog.remove();reject(Error('Запрос отменён'))};dialog.showModal();
  });
  await read(await post('./project-api.php',credentials));r=await post(url,body);
 }
 return read(r);
}
