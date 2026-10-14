import { LEVELS, advanceStage, ARENA_RADIUS, createGame, step, applyUpgrade, STARTERS, MOVES, distance } from './engine.js?v=14';
import { easeCamera, turnCamera } from './camera-motion.js?v=14';
import { loadSettings, saveSettings } from './settings.js?v=14';
import { buildingsForStage } from './regions.js?v=14';
import { groundHeight, riverCenter, ARENA_RADIUS as MAP_RADIUS } from './terrain.js?v=14';
import { ControllerInput } from './controller.js?v=14';
import { GameAudio } from './audio.js?v=14';
import { EVOLUTIONS } from './models.js?v=14';

const $ = id => document.getElementById(id);
const digits = { pikachu: '025', charmander: '004', bulbasaur: '001', squirtle: '007', eevee: '133', vulpix: '037', psyduck: '054', sandshrew: '027' };
const timeLabel = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
let selected = 'pikachu', game = createGame(selected), renderer, lobby = true, previousStatus = '', lastHud = 0, choicesKey = '', resultRecorded = false;
const sound = new GameAudio();
const controller = new ControllerInput(); let controllerActive = false, controllerMenuIndex = 0;
let previousTime = 0, held = new Set(), pulse = {}, dragging = false, dragX = 0, dragY = 0, stick = { x: 0, y: 0 };
let best = null;
let assetsPaused = false, lastBossAlert = -1;
try { best = JSON.parse(localStorage.getItem('pokebonk-best')); } catch { /* Browser storage can be unavailable. */ }
if (best) $('best').textContent = `BEST RUN ${timeLabel(best.time)} / ${best.kills} BONKS`;

function updateSound() { $('sound').textContent = sound.enabled ? 'SOUND ON' : 'SOUND OFF'; $('sound').setAttribute('aria-label', sound.enabled ? 'Mute sound' : 'Enable sound'); }
$('sound').addEventListener('click', () => { sound.toggle(); updateSound(); sound.effect('select'); });
updateSound();

let cameraSettings;
try { cameraSettings = loadSettings(localStorage); } catch { cameraSettings = loadSettings(null); }
function syncCameraSettings() {
  for (const control of document.querySelectorAll('[data-camera-setting]')) {
    const key = control.dataset.cameraSetting;
    if (control.type === 'checkbox') control.checked = cameraSettings[key];
    else control.value = cameraSettings[key];
  }
  for (const output of document.querySelectorAll('[data-sensitivity-value]')) output.textContent = `${cameraSettings.sensitivity.toFixed(2)}×`;
}
for (const control of document.querySelectorAll('[data-camera-setting]')) {
  control.addEventListener('input', () => {
    cameraSettings[control.dataset.cameraSetting] = control.type === 'checkbox' ? control.checked : Number(control.value);
    try { saveSettings(localStorage, cameraSettings); } catch {}
    syncCameraSettings();
  });
}
syncCameraSettings();

function buildStarters() {
  $('starters').replaceChildren();
  for (const [id, data] of Object.entries(STARTERS)) {
    const button = document.createElement('button'); button.className = 'starter' + (selected === id ? ' selected' : ''); button.style.setProperty('--accent', data.color);
    button.setAttribute('aria-pressed', String(selected === id)); button.setAttribute('aria-label', `Choose ${data.name}: ${data.description}`);
    button.innerHTML = `<span class="starter-top"><span>${digits[id]} / ${data.type}</span><span class="selection-dot"></span></span><img class="starter-portrait" alt="" loading="lazy" src="assets/portraits/${Number(digits[id])}.png"><span class="starter-name">${data.name}</span><span class="starter-desc">${data.description}</span>`;
    button.addEventListener('click', () => selectStarter(id)); $('starters').append(button);
  }
}
function selectStarter(id) {
  selected = id; game = createGame(id); game.status = 'lobby'; buildStarters();
  $('specimen-name').textContent = STARTERS[id].name.toUpperCase(); $('specimen-type').textContent = `${STARTERS[id].type} / ${digits[id]}`; sound.unlock(); sound.effect('select');
  if (renderer) { updateAssetStatus(); renderer.prepare(id).catch(() => {}); renderer.requestModel(EVOLUTIONS[id]).catch(() => {}); }
}
function updateAssetStatus(event) {
  if (event?.status === 'renderer-error') { $('error-message').textContent = event.error; $('error').hidden = false; return; }
  if (!renderer || !lobby) return;
  const essentials = [selected, 'gastly', 'geodude'];
  const failed = essentials.find(kind => renderer.errors.has(kind));
  const ready = essentials.every(kind => renderer.ready(kind));
  $('start').disabled = !ready && !failed;
  $('start').innerHTML = `${failed ? 'RETRY DOWNLOAD' : ready ? 'ENTER THE WILD' : 'PREPARING THE WILD…'} <span>↗</span>`;
  $('asset-status').textContent = failed ? 'A Pokémon could not load. Check your connection and retry.' : ready ? 'YOUR POKÉMON IS READY.' : `PREPARING THE WILD · ${essentials.filter(kind => renderer.ready(kind)).length} / 3 READY`;
}
function clearInput() { dragging = false; held.clear(); pulse = {}; stick = { x: 0, y: 0 }; $('joystick').firstElementChild.style.transform = ''; }
function captureMouse() {
  if (controllerActive || !matchMedia('(pointer:fine)').matches || document.pointerLockElement) return;
  try {
    const lock = $('world').requestPointerLock?.();
    lock?.catch(() => { $('look-hint').hidden = false; });
  } catch { $('look-hint').hidden = false; }
}
document.addEventListener('pointerlockchange', () => {
  $('look-hint').hidden = document.pointerLockElement === $('world') || lobby;
  if (!document.pointerLockElement && !lobby && game.status === 'intro' && document.hasFocus()) finishIntro();
  if (!document.pointerLockElement && !lobby && game.status === 'playing' && !controllerActive) pause();
});
document.addEventListener('pointerlockerror', () => { $('look-hint').hidden = lobby; });
$('capture-mouse').addEventListener('click', captureMouse);
function startRun() {
  if (!renderer || ![selected, 'gastly', 'geodude'].every(kind => renderer.ready(kind))) {
    if (renderer) for (const kind of [selected, 'gastly', 'geodude']) renderer.prepare(kind).catch(() => {});
    updateAssetStatus(); return;
  }
  renderer.warmArena();
  game = createGame(selected); lobby = false; resultRecorded = false; choicesKey = ''; previousStatus = ''; clearInput();
  assetsPaused = false; lastBossAlert = -1;
  renderer.camera = { x: 0, z: 0 }; renderer.yaw = renderer.targetYaw = -.35; renderer.pitch = renderer.targetPitch = .53;
  game.status = 'intro'; game.introTime = 0;
  document.body.classList.add('entering'); $('intro').hidden = false; $('hud').hidden = true;
  document.body.classList.add('playing'); $('menu').hidden = true; $('hud').hidden = game.status === 'intro';
  $('look-hint').hidden = !matchMedia('(pointer:fine)').matches;
  for (const id of ['result', 'paused', 'upgrade', 'stage-clear']) $(id).hidden = true;
  buildMoves(); syncHud(); sound.unlock(); sound.effect('portal'); updateSound(); $('world').focus();
  captureMouse();
}
function menu() {
  $('look-hint').hidden = true; $('boss-alert').hidden = true;
  document.body.classList.remove('entering'); $('intro').hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  assetsPaused = false; $('asset-banner').hidden = true;
  clearInput(); lobby = true; document.body.classList.remove('playing'); $('menu').hidden = false; $('hud').hidden = true;
  for (const id of ['result', 'paused', 'upgrade', 'stage-clear']) $(id).hidden = true;
  selectStarter(selected); $('start').focus();
}
function pause() {
  if (lobby) return;
  if (game.status === 'playing') { game.status = 'paused'; $('combat-stats').textContent = `CRIT ${Math.round(game.stats.critChance * 100)}% · ${game.stats.critMultiplier.toFixed(2)}× DAMAGE · ${game.combat.criticalHits} CRITS · ${game.combat.shotsMissed} MISSED SHOTS · ${game.combat.immuneHits} IMMUNE HITS`; clearInput(); $('paused').hidden = false; $('resume').focus(); }
  else if (game.status === 'paused') { game.status = 'playing'; $('paused').hidden = true; clearInput(); captureMouse(); }
}
$('start').addEventListener('click', startRun); $('again').addEventListener('click', startRun); $('change').addEventListener('click', menu);
$('pause').addEventListener('click', pause); $('resume').addEventListener('click', pause); $('quit').addEventListener('click', menu);

function moveIcon(id) {
  return ['thunder','ember','vine','water','rock','shadow'].includes(id) ? `<img class="move-icon" alt="" src="assets/icons/${id}.png">` : MOVES[id].icon;
}

function buildMoves() {
  $('moves').replaceChildren();
  for (const move of game.moves) {
    const data = MOVES[move.id], el = document.createElement('div'); el.className = 'move'; el.style.setProperty('--accent', data.color);
    el.title = `${data.name} · ${data.type} · level ${move.level}`; el.setAttribute('aria-label', el.title); el.dataset.move = move.id;
    el.innerHTML = `<span class="move-symbol" aria-hidden="true">${moveIcon(move.id)}</span><strong class="move-name">${data.name}</strong><span class="move-type">${data.type}</span><span class="move-level">LV ${move.level}</span><span class="move-charge"></span>`; $('moves').append(el);
  }
}
function choose(id) {
  if (applyUpgrade(game, id)) { sound.effect('upgrade'); buildMoves(); choicesKey = ''; clearInput(); $('upgrade').hidden = game.status !== 'upgrade'; if (game.status === 'playing') captureMouse(); }
}
function displayUpgrade() {
  const key = game.choices.map(c => c.id).join(',') + game.level + game.upgradeSource;
  if (key === choicesKey) return;
  choicesKey = key; controllerMenuIndex = 0; clearInput();
  $('upgrade-title').innerHTML = game.upgradeSource === 'shrine' ? 'SHRINE BLESSING<span>✦</span>' : game.upgradeSource === 'chest' ? 'LOOT DROP<span>↗</span>' : 'LEVEL UP<span>↗</span>';
  $('upgrade-eyebrow').textContent = game.evolved ? `${STARTERS[game.starter].evolved.toUpperCase()} IS READY FOR MORE` : 'A LITTLE STRONGER. A LOT MORE DANGEROUS.';
  $('upgrade-subtitle').textContent = game.upgradeSource === 'shrine' ? 'The crystal awakens. Choose your blessing.' : game.upgradeSource === 'chest' ? 'Something good was hiding in that chest. Pick one.' : `Level ${game.level}. Choose one upgrade. The wild can wait.`;
  $('upgrade-options').replaceChildren();
  game.choices.forEach((choice, i) => {
    const b = document.createElement('button'); b.className = 'upgrade-option'; b.style.setProperty('--accent', choice.color);
    b.innerHTML = `<span class="key">${i + 1}</span><span class="micro">${choice.label}</span><span class="upgrade-icon" aria-hidden="true">${choice.id.startsWith('move:') ? moveIcon(choice.id.slice(5)) : choice.icon}</span><strong>${choice.name}</strong><p>${choice.description}</p>${choice.matchup ? `<span class="counter-hint">${choice.matchup}</span>` : ''}`;
    b.addEventListener('click', () => choose(choice.id)); $('upgrade-options').append(b);
  });
  $('upgrade').hidden = false; $('upgrade-options').firstElementChild?.focus(); sound.effect('upgrade');
}
function showResult() {
  if (resultRecorded) return;
  resultRecorded = true; clearInput(); const win = game.status === 'won';
  $('result-eyebrow').textContent = win ? 'THE CLEARING IS YOURS. FOR NOW.' : 'THE WILD ALWAYS HAS ONE MORE';
  $('result-title').textContent = win ? 'UNBONKABLE.' : 'BONKED.';
  $('result-description').textContent = win ? 'Three minutes survived. Mewtwo defeated. One very good Pokémon.' : 'A good run. A questionable survival strategy.';
  $('result-time').textContent = timeLabel(game.time); $('result-kills').textContent = String(game.kills); $('result-level').textContent = String(game.level);
  $('result').hidden = false; $('again').focus();
  if (!best || game.time > best.time || (game.time === best.time && game.kills > best.kills)) {
    best = { time: game.time, kills: game.kills };
    try { localStorage.setItem('pokebonk-best', JSON.stringify(best)); } catch { /* Session-only best if storage is disabled. */ }
    $('best').textContent = `BEST RUN ${timeLabel(best.time)} / ${best.kills} BONKS`;
  }
  sound.effect(win ? 'win' : 'lose');
}
let mapStage = -1; const mapBase = document.createElement('canvas'); mapBase.width = mapBase.height = 192;
function paintMap() {
  const map = $('minimap'), ctx = map.getContext('2d'), p = game.player, center = map.width / 2, scale = (center - 10) / ARENA_RADIUS;
  if (mapStage !== game.stage) {
    mapStage = game.stage; $('map-region').textContent = LEVELS[game.stage].name.toUpperCase(); const base = mapBase.getContext('2d'); base.clearRect(0, 0, 192, 192); base.save(); base.beginPath(); base.arc(center, center, center - 10, 0, Math.PI * 2); base.clip();
    for (let x = -ARENA_RADIUS; x < ARENA_RADIUS; x += 5) for (let z = -ARENA_RADIUS; z < ARENA_RADIUS; z += 5) {
      const hue = [95, 38, 255][game.stage], light = 24 + Math.min(9, Math.max(0, groundHeight(x, z))) * 2.3;
      base.fillStyle = `hsl(${hue} 25% ${light}%)`; base.fillRect(center + x * scale, center + z * scale, 5 * scale + 1, 5 * scale + 1);
    }
    base.strokeStyle = '#c8b486'; base.lineWidth = 3; base.beginPath();
    for (let x = -ARENA_RADIUS; x <= ARENA_RADIUS; x += 4) { const px = center + x * scale, py = center + Math.sin(x * .1) * 3 * scale; if (x === -ARENA_RADIUS) base.moveTo(px, py); else base.lineTo(px, py); } base.stroke();
    base.strokeStyle = '#72c5e0'; base.lineWidth = 6; base.beginPath();
    for (let z = -ARENA_RADIUS; z <= ARENA_RADIUS; z += 4) { const px = center + riverCenter(z) * scale, py = center + z * scale; if (z === -ARENA_RADIUS) base.moveTo(px, py); else base.lineTo(px, py); } base.stroke();
    for (const b of buildingsForStage(game.stage)) { base.fillStyle = b.roof; base.fillRect(center + (b.x - b.w / 2) * scale, center + (b.z - b.d / 2) * scale, b.w * scale, b.d * scale); }
    base.restore();
  }
  ctx.clearRect(0, 0, map.width, map.height); ctx.drawImage(mapBase, 0, 0); ctx.strokeStyle = '#d4ddc922'; ctx.lineWidth = 1;
  for (const r of [ARENA_RADIUS * .3 * scale, ARENA_RADIUS * .6 * scale, ARENA_RADIUS * scale]) { ctx.beginPath(); ctx.arc(center, center, r, 0, Math.PI * 2); ctx.stroke(); }
  const point = (x, z, col, r) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(center + x * scale, center + z * scale, r, 0, Math.PI * 2); ctx.fill(); };
  for (const e of game.enemies) point(e.x, e.z, e.boss ? '#dca4ef' : '#e5967b', e.boss ? 3 : 1.5);
  for (const c of game.chests) if (!c.opened) point(c.x, c.z, '#e4cd85', 2.5);
  for (const shrine of game.shrines) if (!shrine.completed) point(shrine.x, shrine.z, '#bd8cff', 3);
  for (const ball of game.pokeballs) if (!ball.broken) point(ball.x, ball.z, '#7ce1fb', 2);
  point(p.x, p.z, '#e6f3bf', 3);
}
function syncHud() {
  const p = game.player, data = STARTERS[game.starter];
  $('player-name').textContent = (game.evolved ? data.evolved : data.name).toUpperCase(); $('player-type').textContent = game.player.types.join(' / ');
  $('avatar').textContent = MOVES[data.move].icon; $('avatar').style.color = data.color;
  $('health-fill').style.width = `${p.hp / p.maxHp * 100}%`; $('health-fill').style.background = p.hp / p.maxHp < .3 ? '#f0987d' : '#d8ef85';
  $('health-number').textContent = `${Math.ceil(p.hp)} / ${p.maxHp} HP`;
  $('timer').textContent = timeLabel(game.stageTime); $('wave').textContent = `AREA ${game.stage + 1} / ${LEVELS.length} · WAVE ${game.wave} / 6`;
  $('kills').textContent = String(game.kills); $('gold').textContent = String(game.gold); $('level').textContent = String(game.level);
  $('xp-fill').style.width = `${Math.min(100, game.xp / game.xpNext * 100)}%`; $('xp-number').textContent = `${game.xp} / ${game.xpNext} XP`;
  $('dash-fill').style.width = `${(1 - p.dashCooldown / 2.8) * 100}%`; $('dash-label').textContent = p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : 'READY';
  $('notice').textContent = game.notice; $('notice').style.opacity = game.noticeTime > 0 ? '1' : '0';
  const shrine = game.shrines.find(s => !s.completed && distance(s, p) < 4.5);
  const chest = game.chests.find(c => !c.opened && distance(c, p) < 3);
  $('chest-prompt').hidden = !chest && !shrine;
  if (shrine) $('chest-prompt').textContent = shrine.active ? `SHRINE · ${Math.floor(shrine.charge * 100)}% · STAY IN THE RING` : '[ E / OPEN ] AWAKEN CRYSTAL SHRINE';
  if (chest) $('chest-prompt').textContent = game.gold >= 15 ? '[ E / OPEN ] OPEN CHEST · 15 COINS' : 'CHEST · NEED 15 COINS';
  for (const node of $('moves').children) {
    const m = game.moves.find(m => m.id === node.dataset.move);
    node.querySelector('.move-charge').style.height = `${Math.max(0, 1 - m.cooldown / (MOVES[m.id].cooldown / game.stats.haste)) * 100}%`;
  }
  paintMap();
}

window.addEventListener('keydown', event => {
  if (event.target?.matches?.('input, select, textarea')) return;
  const key = event.key.toLowerCase();
  // Keep cancelable Ctrl+movement shortcuts out of active play. Sliding
  // uses C because browsers can reserve Ctrl+W before JavaScript sees it.
  if (!lobby && game.status === 'playing' && event.ctrlKey && ['w', 'a', 's', 'd', 'e', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  if (['control', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  if (event.repeat) return;
  held.add(key);
  if (key === 'escape') { if (game.status === 'intro') finishIntro(); else pause(); }
  if (game.status === 'upgrade' && ['1', '2', '3'].includes(key)) { const choice = game.choices[Number(key) - 1]; if (choice) choose(choice.id); return; }
  if (lobby && ['1', '2', '3', '4', '5', '6', '7', '8'].includes(key)) selectStarter(Object.keys(STARTERS)[Number(key) - 1]);
  if (!lobby && game.status === 'playing') { if (key === 'shift') pulse.dash = true; if (key === ' ') pulse.jump = true; if (key === 'e') pulse.interact = true; }
});
window.addEventListener('keyup', event => held.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { clearInput(); if (game.status === 'playing' && !lobby) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (game.status === 'playing' && !lobby) pause(); } });
document.addEventListener('pointerdown', event => {
  if (event.target.closest('button, a, input, select, textarea, details, fieldset, label')) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (lobby) { dragging = true; dragX = event.clientX; dragY = event.clientY; $('world').setPointerCapture(event.pointerId); return; }
  if (game.status !== 'playing') return;
  if (event.pointerType === 'mouse') { captureMouse(); $('world').focus(); return; }
  dragging = true; dragX = event.clientX; dragY = event.clientY; $('world').setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove', event => {
  if (!renderer) return;
  if (lobby) {
    if (dragging) turnCamera(renderer.previewCamera, event.clientX - dragX, event.clientY - dragY, cameraSettings);
    dragX = event.clientX; dragY = event.clientY; return;
  }
  if (game.status !== 'playing') return;
  const locked = document.pointerLockElement === $('world');
  if (locked || (event.target === $('world') && event.pointerType === 'mouse')) {
    turnCamera(renderer, event.movementX || 0, event.movementY || 0, cameraSettings);
  } else if (dragging) {
    turnCamera(renderer, event.clientX - dragX, event.clientY - dragY, cameraSettings);
  }
  dragX = event.clientX; dragY = event.clientY;
});
$('world').addEventListener('pointerup', () => { dragging = false; });
$('world').addEventListener('pointercancel', () => { dragging = false; });
$('joystick').addEventListener('pointerdown', event => { $('joystick').setPointerCapture(event.pointerId); moveStick(event); });
$('joystick').addEventListener('pointermove', event => { if ($('joystick').hasPointerCapture(event.pointerId)) moveStick(event); });
function moveStick(event) {
  const bounds = $('joystick').getBoundingClientRect(), x = event.clientX - bounds.left - bounds.width / 2, y = event.clientY - bounds.top - bounds.height / 2;
  const length = Math.hypot(x, y), limit = 30, factor = length > limit ? limit / length : 1;
  stick = { x: x * factor / limit, y: y * factor / limit }; $('joystick').firstElementChild.style.transform = `translate(${stick.x * limit}px,${stick.y * limit}px)`;
}
for (const event of ['pointerup', 'pointercancel']) $('joystick').addEventListener(event, () => { stick = { x: 0, y: 0 }; $('joystick').firstElementChild.style.transform = ''; });
for (const action of ['jump', 'dash', 'interact']) $('touch-' + action).addEventListener('pointerdown', event => { event.preventDefault(); pulse[action] = true; });

function enterNextArea() {
  if (!advanceStage(game)) return;
  $('stage-clear').hidden = true; renderer.camera = { x: 0, z: 0 }; renderer.cameraHeight = 0;
  game.status = 'intro'; game.introTime = 0; document.body.classList.add('entering'); $('intro').hidden = false; $('hud').hidden = true;
  clearInput(); captureMouse(); sound.effect('portal'); syncHud();
}
$('next-stage').addEventListener('click', enterNextArea);

function finishIntro() {
  if (game.status !== 'intro') return;
  game.status = 'playing'; clearInput();
  document.body.classList.remove('entering'); $('intro').hidden = true; $('hud').hidden = false;
  sound.effect('start');
}
$('skip-intro').addEventListener('click', finishIntro);

function handleController(pad, dt) {
  if (controllerActive && !pad.connected && game.status === 'playing') pause();
  controllerActive = pad.connected;
  $('controller-status').textContent = pad.connected ? 'CONTROLLER READY · A: CONFIRM · B: BACK · MENU: PAUSE' : 'CONTROLLER · PRESS A TO CONNECT';
  if (!pad.connected) return;
  $('look-hint').hidden = true;
  if (pad.pressed.has(9)) { if (game.status === 'intro') finishIntro(); else pause(); }
  if (lobby) {
    const roster = Object.keys(STARTERS), direction = pad.navX || pad.navY || (pad.pressed.has(4) ? -1 : pad.pressed.has(5) ? 1 : 0);
    if (direction) selectStarter(roster[(roster.indexOf(selected) + direction + roster.length) % roster.length]);
    turnCamera(renderer.previewCamera, pad.look.x * dt * 450, pad.look.y * dt * 350, cameraSettings);
    if (pad.pressed.has(0)) startRun();
    return;
  }
  if (game.status === 'intro') { if (pad.pressed.has(0)) finishIntro(); return; }
  if (game.status === 'playing') {
    turnCamera(renderer, pad.look.x * dt * 450, pad.look.y * dt * 350, cameraSettings);
    if (pad.pressed.has(0)) pulse.jump = true;
    if (pad.pressed.has(1)) pulse.dash = true;
    if (pad.pressed.has(2)) pulse.interact = true;
    return;
  }
  if (game.status === 'upgrade') {
    if (pad.navX || pad.navY) controllerMenuIndex = (controllerMenuIndex + (pad.navX || pad.navY) + game.choices.length) % game.choices.length;
    [...$('upgrade-options').children].forEach((button, i) => button.classList.toggle('controller-focus', i === controllerMenuIndex % game.choices.length));
    if (pad.pressed.has(0)) choose(game.choices[controllerMenuIndex % game.choices.length].id);
    return;
  }
  if (game.status === 'stage-clear') { if (pad.pressed.has(0)) enterNextArea(); return; }
  if (game.status === 'paused') {
    if (pad.pressed.has(1)) { pause(); return; }
    const elements = [...$('paused').querySelectorAll('input, button')];
    let index = elements.indexOf(document.activeElement); if (index < 0) index = 0;
    if (pad.navY) elements[(index + pad.navY + elements.length) % elements.length].focus();
    const focused = document.activeElement;
    if (pad.navX && focused?.type === 'range') {
      focused.value = Math.max(Number(focused.min), Math.min(Number(focused.max), Number(focused.value) + pad.navX * .05)); focused.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (pad.pressed.has(0) && focused) focused.click();
    return;
  }
  if (['dead', 'won'].includes(game.status) && pad.pressed.has(0)) startRun();
}

function advanceFrame(time) {
  const frameElapsed = Math.min((time - previousTime) / 1000 || .016, .5);
  const dt = Math.min(frameElapsed, .05); previousTime = time;
  let pad;
  try { pad = controller.poll(navigator.getGamepads?.() ?? [], time / 1000); } catch { pad = controller.poll([], time / 1000); }
  if (renderer && document.hasFocus() && !document.hidden) handleController(pad, dt);
  if (renderer) { easeCamera(renderer, dt); easeCamera(renderer.previewCamera, dt); }
  if (!lobby) {
    if (game.status === 'intro' && !document.hidden && document.hasFocus()) {
      game.introTime += frameElapsed;
      if (game.introTime >= 2.8) finishIntro();
    }
    if (document.pointerLockElement && game.status !== 'playing' && game.status !== 'intro') document.exitPointerLock();
    const required = [game.evolved ? EVOLUTIONS[game.starter] : game.starter, ...game.enemies.filter(e => distance(e, game.player) <= 40).map(e => e.kind)];
    const missing = [...new Set(required)].filter(kind => !renderer.ready(kind));
    if (game.status === 'playing' && missing.length) { game.status = 'loading'; assetsPaused = true; clearInput(); }
    if (assetsPaused) {
      const failed = missing.find(kind => renderer.errors.has(kind));
      if (failed) { $('error-message').textContent = `The ${failed} model could not load. Check your connection and reload to retry.`; $('error').hidden = false; }
      if (!missing.length) { game.status = 'playing'; assetsPaused = false; $('asset-banner').hidden = true; }
      else { $('asset-banner').hidden = false; $('asset-banner').textContent = 'PREPARING THE NEXT ENCOUNTER…'; }
    }
    const horizontal = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0) + stick.x + (pad.connected ? pad.move.x : 0);
    const vertical = (held.has('s') || held.has('arrowdown') ? 1 : 0) - (held.has('w') || held.has('arrowup') ? 1 : 0) + stick.y + (pad.connected ? pad.move.y : 0);
    const c = Math.cos(renderer.yaw), s = Math.sin(renderer.yaw);
    const input = { slide: held.has('c') || pad.held.has(6) || pad.held.has(10), x: horizontal * c + vertical * s, z: -horizontal * s + vertical * c, ...pulse }; pulse = {};
    const killsBefore = game.kills, hpBefore = game.player.hp, xpBefore = game.xp, evolvedBefore = game.evolved;
    if (game.status === 'playing') { if (input.dash && game.player.dashCooldown === 0) sound.effect('dash'); if (input.jump && game.player.y === 0) sound.effect('jump'); }
    step(game, input, dt);
    if (game.kills > killsBefore) sound.effect('bonk');
    if (game.player.hp < hpBefore) sound.effect('hurt');
    if (game.xp > xpBefore) sound.effect('candy');
    if (game.evolved && !evolvedBefore) sound.effect('evolve');
    const alert = game.bossAlert;
    $('boss-alert').hidden = !alert || alert.remaining <= 0;
    if (alert?.remaining > 0) {
      $('boss-alert-name').textContent = alert.name; $('boss-alert-title').textContent = alert.title;
      if (lastBossAlert !== alert.id) { lastBossAlert = alert.id; sound.effect('boss'); }
    }
    if (game.status === 'upgrade') displayUpgrade();
    if (game.status === 'stage-clear') {
      $('stage-clear').hidden = false; $('cleared-area').textContent = LEVELS[game.stage].name;
      $('next-area').textContent = `${LEVELS[game.stage + 1].name} · keep your moves and upgrades`;
    }
    if (game.status === 'dead' || game.status === 'won') showResult();
    if (time - lastHud > 90 || previousStatus !== game.status) { syncHud(); lastHud = time; previousStatus = game.status; }
  }
  sound.tick(lobby ? 'lobby' : game.status, Math.min(1, (game.stage + game.stageTime / game.duration) / LEVELS.length));
  renderer.render(game, time / 1000, lobby);
}
function frame(time) {
  try { advanceFrame(time); requestAnimationFrame(frame); }
  catch (error) {
    game.status = 'error'; clearInput();
    const report = { message: error.message, stack: error.stack, time: game.time, starter: game.starter,
      enemies: game.enemies.length, actors: renderer?.actorMap.size, gpu: renderer?.gpu.info.memory };
    if (document.pointerLockElement) document.exitPointerLock();
    document.body.classList.remove('entering'); $('intro').hidden = true;
    window.pokebonkCrash = report;
    console.error('Pokébonk runtime error:', report);
    $('error-message').textContent = `The game stopped: ${error.message}`;
    $('error-help').textContent = 'Copy this error message so we can fix the exact failure. Your browser console also has a Pokébonk crash report.';
    $('error').hidden = false;
  }
}
buildStarters(); game.status = 'lobby';
try {
  const { Renderer } = await import('./renderer.js?v=14');
  renderer = new Renderer($('world'), $('effects'), updateAssetStatus);
  updateAssetStatus();
  for (const kind of ['pikachu', 'gastly', 'geodude']) renderer.prepare(kind).catch(() => {});
  requestAnimationFrame(frame);
} catch (error) {
  $('error-message').textContent = `The 3D renderer could not start: ${error.message}`;
  $('error-help').textContent = 'Allow access to cdn.jsdelivr.net and raw.githubusercontent.com, and enable browser hardware acceleration. Local asset installation is also available.';
  $('error').hidden = false; console.error(error);
}

// Small developer hook for inspecting an actual run without affecting normal play.
window.pokebonk = { get state() { return game; }, get camera() { return { yaw: renderer.yaw, pitch: renderer.pitch, previewYaw: renderer.previewCamera.yaw, previewPitch: renderer.previewCamera.pitch, position: renderer.view.position.toArray() }; }, startRun, pause };
