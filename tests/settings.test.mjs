import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,bindKey,loadSettings} from '../dist/settings.js';
test('rebinding controls swaps conflicts and persists across reload',()=>{const s=defaultSettings();assert.equal(bindKey(s,'forward','KeyE'),true);assert.equal(s.bindings.forward,'KeyE');assert.equal(s.bindings.interact,'KeyW');assert.deepEqual(loadSettings(JSON.stringify(s)),s);});
test('invalid keys and corrupt preferences cannot break controls',()=>{const s=defaultSettings();assert.equal(bindKey(s,'forward','Escape'),false);assert.equal(bindKey(s,'missing','KeyZ'),false);assert.equal(bindKey(s,'forward','<script>'),false);assert.deepEqual(loadSettings('broken'),s);const next=loadSettings(JSON.stringify({fov:999,sensitivity:-10,quality:'unknown',bindings:{forward:'invalid'}}));assert.equal(next.fov,100);assert.equal(next.sensitivity,.2);assert.equal(next.quality,'balanced');assert.deepEqual(next.bindings,s.bindings);});
