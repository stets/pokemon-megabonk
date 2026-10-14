import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual registered keyboard handler without needing WebGL.
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const handlerSource = app.slice(app.indexOf("window.addEventListener('keydown'"), app.indexOf("window.addEventListener('keyup'"));
function keyboard(status = 'playing') {
  let handler;
  const context = { window: { addEventListener(name, callback) { handler = callback; } },
    lobby: false, game: { status }, held: new Set(), pulse: {}, pause() {} };
  vm.runInNewContext(handlerSource, context);
  return { context, press(key, ctrlKey = false) {
    let prevented = false;
    handler({ key, ctrlKey, repeat: false, preventDefault() { prevented = true; } });
    return prevented;
  } };
}

test('Ctrl+D/A/S stay in the run and still register movement', () => {
  const k = keyboard();
  for (const key of ['d', 'a', 's']) {
    assert.equal(k.press(key, true), true);
    assert.equal(k.context.held.has(key), true);
    assert.equal(k.context.game.status, 'playing');
  }
});
test('browser shortcuts remain available outside active play', () => {
  assert.equal(keyboard('paused').press('d', true), false);
  assert.equal(keyboard('upgrade').press('d', true), false);
  assert.equal(keyboard().press('r', true), false);
});
