'use strict';
(() => {
  const banks = {
    privat: ['ПриватБанк', 'https://privatbank.ua/obmin-valiut'],
    oschad: ['Ощадбанк', 'https://www.oschadbank.ua/currency-rate'],
    sense: ['Sense Bank', 'https://sensebank.ua/currency-exchange']
  };
  const mirror = 'https://minfin.com.ua/ua/currency/kiev/usd/';
  const key = 'pulse_preview_cash_quotes_v1';
  const number = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Kyiv', dateStyle: 'short', timeStyle: 'short' });
  function link(label, href) {
    const a = document.createElement('a');
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = label;
    a.style.color = 'inherit';
    return a;
  }
  function valid(q) {
    return q && Number.isFinite(q.buy) && Number.isFinite(q.sell) && q.buy > 0 && q.sell >= q.buy;
  }
  let sharedRefresh;
  async function refresh() {
    if (!sharedRefresh) sharedRefresh = fetch('rates.php', { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw Error(); return r.json(); })
      .finally(() => { sharedRefresh = null; });
    return sharedRefresh;
  }
  window.mountPulseRates = function mountPulseRates(box) {
    let snapshot = {};
    try { snapshot = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
    box.innerHTML = '<h3>Наличный доллар</h3><small>Гривен за 1 USD · кассы</small><table style="width:100%;border-spacing:0 .8em;text-align:right;font-variant-numeric:tabular-nums"><thead><tr><th style="text-align:left">Банк</th><th>Покупка</th><th>Продажа</th></tr></thead><tbody></tbody></table><small class="rate-date"></small> <button type="button" class="secondary">Обновить</button><p role="status"></p>';
    const body = box.querySelector('tbody'), stamp = box.querySelector('.rate-date');
    const status = box.querySelector('[role=status]'), button = box.querySelector('button');
    function draw() {
      body.replaceChildren();
      for (const [id, [name, url]] of Object.entries(banks)) {
        const q = snapshot.quotes?.[id], row = body.insertRow(), bank = row.insertCell();
        bank.style.textAlign = 'left'; bank.append(link(name, url));
        if (valid(q)) {
          const source = document.createElement('small');
          source.style.cssText = 'display:block;font-size:.72em;opacity:.8';
          source.append(q.source === 'minfin' ? link('Мінфін · Киев', mirror) : link('Кассы банка', url));
          if (q.quoteTime) source.append(document.createElement('br'), String(q.quoteTime));
          if (q.checkedAt !== snapshot.checkedAt) source.append(document.createElement('br'), 'Предыдущие данные · ' + date.format(new Date(q.checkedAt)));
          bank.append(source);
        }
        row.insertCell().textContent = valid(q) ? number.format(q.buy) : '—';
        row.insertCell().textContent = valid(q) ? number.format(q.sell) : '—';
      }
      stamp.textContent = snapshot.checkedAt ? 'Последняя сводка · ' + date.format(new Date(snapshot.checkedAt)) + ' (Киев)' : 'Сводка ещё не получена';
    }
    async function update() {
      button.disabled = true; status.textContent = 'Получаем наличные курсы…';
      try {
        const data = await refresh();
        if (isNaN(Date.parse(data.checkedAt))) throw Error();
        const received = Object.keys(banks).filter(id => valid(data.quotes?.[id]));
        if (!received.length) throw Error();
        const quotes = { ...snapshot.quotes };
        received.forEach(id => { quotes[id] = { ...data.quotes[id], checkedAt: data.checkedAt }; });
        snapshot = { checkedAt: data.checkedAt, quotes };
        try { localStorage.setItem(key, JSON.stringify(snapshot)); } catch {}
        draw(); status.textContent = received.length === 3 ? '' : 'Часть банков не обновилась.';
      } catch { status.textContent = snapshot.checkedAt ? 'Не удалось обновить. Показана сохранённая сводка.' : 'Сводка недоступна. Попробуйте обновить позже.'; }
      finally { button.disabled = false; }
    }
    draw(); button.onclick = update; if (!snapshot.checkedAt) update();
  };
})();
