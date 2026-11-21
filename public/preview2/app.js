(() => {
  'use strict';
  const key = 'publkey-preview2-coins-v1';
  const stage = document.getElementById('stage');
  const controls = document.getElementById('controls');
  const hint = document.getElementById('hint');
  const fullscreenButton = document.getElementById('fullscreenButton');
  const fullscreenStatus = document.getElementById('fullscreenStatus');
  const sizeSlider = document.getElementById('size');
  const distanceSlider = document.getElementById('distance');
  const sizeValue = document.getElementById('sizeValue');
  const distanceValue = document.getElementById('distanceValue');
  const left = document.getElementById('coinLeft');
  const right = document.getElementById('coinRight');
  let cursorTimer;
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
  const activeFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
  function showCursorTemporarily() {
    clearTimeout(cursorTimer);
    document.documentElement.classList.remove('cursor-hidden');
    if (activeFullscreen()) {
      cursorTimer = setTimeout(() => {
        if (activeFullscreen()) document.documentElement.classList.add('cursor-hidden');
      }, 2000);
    }
  }
  const updateFullscreenState = () => {
    if (activeFullscreen()) {
      controls.hidden = true;
      hint.classList.add('hidden');
      fullscreenButton.blur();
    }
    showCursorTemporarily();
    render();
  };
  fullscreenButton.addEventListener('click', async event => {
    event.stopPropagation();
    fullscreenStatus.hidden = true;
    try {
      if (stage.requestFullscreen) await stage.requestFullscreen();
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
      else throw new Error('Fullscreen API unavailable');
      updateFullscreenState();
    } catch (_) {
      fullscreenStatus.textContent = 'Полноэкранный режим недоступен в этом браузере.';
      fullscreenStatus.hidden = false;
    }
  });
  stage.addEventListener('click', async event => {
    if (activeFullscreen()) {
      clearTimeout(cursorTimer);
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (_) { /* The browser can also leave fullscreen via its own controls. */ }
      return;
    }
    if (event.target.closest('[data-control]')) return;
    controls.hidden = !controls.hidden;
    hint.classList.add('hidden');
  });
  document.addEventListener('fullscreenchange', updateFullscreenState);
  document.addEventListener('webkitfullscreenchange', updateFullscreenState);
  stage.addEventListener('pointermove', showCursorTemporarily);
  stage.addEventListener('mousemove', showCursorTemporarily);
  sizeSlider.addEventListener('input', update);
  distanceSlider.addEventListener('input', update);
  window.addEventListener('resize', render);
  render();
})();
