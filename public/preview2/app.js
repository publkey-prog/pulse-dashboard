(() => {
  'use strict';
  const key = 'publkey-preview2-coins-v1';
  const stage = document.getElementById('stage');
  const controls = document.getElementById('controls');
  const hint = document.getElementById('hint');
  const sizeSlider = document.getElementById('size');
  const distanceSlider = document.getElementById('distance');
  const sizeValue = document.getElementById('sizeValue');
  const distanceValue = document.getElementById('distanceValue');
  const left = document.getElementById('coinLeft');
  const right = document.getElementById('coinRight');
  try {
    const previous = JSON.parse(localStorage.getItem(key) || '{}');
    if (Number.isFinite(+previous.size)) sizeSlider.value = Math.min(17, Math.max(5, +previous.size));
    if (Number.isFinite(+previous.distance)) distanceSlider.value = Math.min(100, Math.max(0, +previous.distance));
  } catch (_) { /* Controls still work if storage is unavailable. */ }
  function render() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const sizePct = Number(sizeSlider.value);
    const distancePct = Number(distanceSlider.value);
    const diameter = Math.max(38, Math.min(w * sizePct / 100, h * .34));
    const minCenters = diameter * 1.16;
    const maxCenters = Math.max(minCenters, w - diameter - Math.max(28, w * .055));
    const centers = minCenters + (maxCenters - minCenters) * distancePct / 100;
    stage.style.setProperty('--coin-size', `${diameter}px`);
    left.style.left = `${w / 2 - centers / 2}px`;
    right.style.left = `${w / 2 + centers / 2}px`;
    sizeValue.value = `${sizePct.toFixed(1).replace('.0', '')}%`;
    distanceValue.value = `${Math.round(centers / w * 100)}% экрана`;
  }
  function update() {
    render();
    try {
      localStorage.setItem(key, JSON.stringify({size: Number(sizeSlider.value), distance: Number(distanceSlider.value), updated: new Date().toISOString().slice(0, 10)}));
    } catch (_) { /* Private browsing can disable local storage. */ }
  }
  stage.addEventListener('click', event => {
    if (event.target.closest('[data-control]')) return;
    controls.hidden = !controls.hidden;
    hint.classList.add('hidden');
  });
  sizeSlider.addEventListener('input', update);
  distanceSlider.addEventListener('input', update);
  window.addEventListener('resize', render);
  render();
})();
