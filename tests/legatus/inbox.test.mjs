import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import * as cssTree from 'css-tree';
import { createBus } from '../../packages/legatus/src/runtime/core/bus.js';
import { createStore } from '../../packages/legatus/src/runtime/core/store.js';
import { createI18n } from '../../packages/legatus/src/runtime/core/i18n.js';
import { LegatusClient } from '../../packages/legatus/src/runtime/core/client.js';
import { defineBell } from '../../packages/legatus/src/runtime/components/elements.js';
import { defineCenter } from '../../packages/legatus/src/runtime/components/hub.js';
import { activityKind } from '../../packages/legatus/src/runtime/core/activity.js';
import { actorsFromItem, notificationItemHtml } from '../../packages/legatus/src/runtime/components/item.js';
import { resolveNotificationUrl } from '../../packages/legatus/src/runtime/core/deepLink.js';

const css = readFileSync(new URL('../../packages/legatus/src/runtime/styles.css', import.meta.url), 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const makeItems = (n) => Array.from({length:n}, (_, i) => ({receiver_id:`r${i}`, notification_id:`n${i}`, title:`Thông báo ${i}`, body:'Một hoạt động mới', created_at:new Date(Date.now()-i*3600000).toISOString(), read_at:i%2 ? '2026-10-20' : null, data:{event_type:i%3 === 0 ? 'homework.progress' : i%3 === 1 ? 'library.quiz.used' : 'quiz.created', actors:i%3===0 ? [{name:'An',avatarId:'fox',state:'in_progress'}] : []}}));

function fixture(items = makeItems(83), mobile = false) {
  const dom = new JSDOM('<!doctype html><html lang="vi"><body></body></html>', {url:'https://lib.quizzman.com', pretendToBeVisual:true});
  for (const key of ['window','document','HTMLElement','customElements','MutationObserver','CustomEvent']) globalThis[key]=dom.window[key];
  window.matchMedia = (query) => ({matches:query.includes('720px') && mobile, addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  const bus=createBus(), store=createStore(bus), i18n=createI18n(()=> 'vi');
  const client=new LegatusClient({endpoint:'https://legatus.quizzman.com',getToken:async()=>null,bus,store});
  client.shared=null;
  const requests=[];
  client.request=async(path)=>{
    requests.push(path);
    if(path.includes('unread-count')) return {count:42};
    if(path.includes('/read')) return {};
    const u=new URL(path,'https://legatus.quizzman.com');
    const offset=Number(u.searchParams.get('cursor')||0),limit=Number(u.searchParams.get('limit')||20);
    return {items:items.slice(offset,offset+limit), next_cursor:offset+limit<items.length?String(offset+limit):null,has_more:offset+limit<items.length};
  };
  const runtime={bus,store,i18n,client,ensureStarted(){},openCenter(){},closeCenter(){}};
  defineBell(css,runtime); defineCenter(css,runtime);
  const bell=document.createElement('legatus-bell'); document.body.append(bell);
  return {dom,runtime,bell,requests,root:()=>bell.shadowRoot.querySelector('[data-list]')};
}

test('all 83 notifications are reachable across cached and cursor pages; no slice-at-30 loss',async()=>{
  const f=fixture(); await f.bell.open();
  const seen=new Set(); let pages=0;
  while(true){
    const root=f.root(); const rows=[...root.querySelectorAll('.lg-item')];
    assert.ok(rows.length<=10); rows.forEach((row)=>seen.add(row.dataset.receiver)); pages++;
    const next=root.querySelector('[data-feed-action="previous"]'); if(next.disabled) break;
    next.click(); await tick(); assert.ok(pages<15);
  }
  assert.equal(seen.size,83); assert.equal(pages,9);
  assert.ok(f.requests.some((p)=>p.includes('cursor=80')));
  f.root().querySelector('[data-feed-action="next"]').click();
  assert.equal(f.root().querySelector('.lg-item').dataset.receiver,'r70');
  f.dom.window.close();
});

test('filters, date groups, mascot stacks and mobile share page state; read items leave unread filter',async()=>{
  const f=fixture(makeItems(40),true); await f.bell.open();
  assert.equal(f.bell.shadowRoot.querySelector('.lg-sheet').hidden,false);
  f.root().querySelector('[data-feed-action="library"]').click();
  assert.ok([...f.root().querySelectorAll('.lg-item')].every((row)=>Number(row.dataset.receiver.slice(1))%3===1));
  assert.equal(f.root().querySelectorAll('.lg-item').length,f.bell.shadowRoot.querySelector('[data-list-mobile]').querySelectorAll('.lg-item').length);
  f.root().querySelector('[data-feed-action="learning"]').click();
  assert.ok(f.root().querySelector('.lg-faces svg')); assert.ok(f.root().querySelector('.lg-feed-heading'));
  f.root().querySelector('[data-feed-action="unread"]').click();
  const row=f.root().querySelector('.lg-item'); const id=row.dataset.receiver; row.click(); await tick();
  assert.equal(f.root().querySelector(`[data-receiver="${id}"]`),null);
  f.dom.window.close();
});

test('failed cursor request keeps current rows and page; retry reaches remaining items',async()=>{
  const f=fixture(makeItems(30)); await f.bell.open();
  f.root().querySelector('[data-feed-action="previous"]').click(); await tick();
  const request=f.runtime.client.request; let fail=true;
  f.runtime.client.request=async(path)=>{if(path.includes('cursor=20')&&fail){fail=false;throw new Error('network down');} return request(path);};
  f.root().querySelector('[data-feed-action="previous"]').click(); await tick();
  assert.equal(f.root().querySelector('.lg-item').dataset.receiver,'r10');
  assert.ok(f.root().querySelector('[data-feed-action="retry"]'));
  f.root().querySelector('[data-feed-action="previous"]').click(); await tick();
  assert.equal(f.root().querySelector('.lg-item').dataset.receiver,'r20');
  assert.equal(f.root().querySelector('[data-feed-action="previous"]').disabled,true);
  f.dom.window.close();
});

test('an empty filtered page can continue fetching older data, and does not falsely report end',async()=>{
  const items=makeItems(25).map((it,i)=>({...it,data:{event_type:i===24?'library.quiz.used':'quiz.created'}}));
  const f=fixture(items); await f.bell.open();
  f.root().querySelector('[data-feed-action="library"]').click();
  assert.match(f.root().textContent,/Chưa có mục phù hợp/);
  const next=f.root().querySelector('[data-feed-action="previous"]'); assert.equal(next.disabled,false); next.click(); await tick();
  assert.equal(f.root().querySelector('.lg-item').dataset.receiver,'r24');
  f.dom.window.close();
});

test('bell and hub have direct Legatus website links, and hub has the same pagination',async()=>{
  const f=fixture(); await f.bell.open();
  for(const a of f.bell.shadowRoot.querySelectorAll('.lg-open-legatus')) assert.equal(a.href,'https://legatus.quizzman.com/');
  const hub=document.createElement('legatus-center'); document.body.append(hub); await hub.open();
  assert.equal(hub.shadowRoot.querySelector('.lg-open-legatus').href,'https://legatus.quizzman.com/');
  assert.equal(hub.shadowRoot.querySelectorAll('.lg-item').length,10);
  assert.ok(hub.shadowRoot.querySelector('[data-feed-action="previous"]'));
  f.dom.window.close();
});

test('duplicate overlapping requests/pages cannot multiply rows or unread decrements',async()=>{
  const f=fixture(makeItems(25));
  const first=f.runtime.client.fetchNotifications(); const second=f.runtime.client.fetchNotifications();
  assert.equal(first,second); await first;
  await f.runtime.client.fetchNotifications({cursor:'10',limit:20});
  assert.equal(f.runtime.store.get().items.length,25);
  f.runtime.store.set({unread:12});
  await Promise.all([f.runtime.client.markRead('r0'),f.runtime.client.markRead('r0')]);
  assert.equal(f.runtime.store.get().unread,11);
  await f.runtime.client.markRead('r0'); assert.equal(f.runtime.store.get().unread,11);
  f.runtime.client._onMessage({type:'notification',receiver_id:'r0',notification_id:'n0',data:{event_type:'homework.progress'}});
  assert.equal(f.runtime.store.get().unread,12);
  f.runtime.client._onMessage({type:'notification',receiver_id:'r0',notification_id:'n0',data:{event_type:'homework.progress'}});
  assert.equal(f.runtime.store.get().unread,12);
  f.dom.window.close();
});

test('group classification, legacy deep links and unsafe text are handled without executable HTML',()=>{
  assert.equal(activityKind({data:{assignmentId:'x'}}),'learning');
  assert.equal(activityKind({event_type:'library.quiz.used',data:{sessionCount:1}}),'library');
  assert.equal(resolveNotificationUrl({data:{deepLink:'https://app.quizzman.com/assignment/?section=activity'}}),'https://app.quizzman.com/assignment/?section=activity');
  assert.equal(resolveNotificationUrl({data:{url:'javascript:alert(1)'}}),null);
  const i18n=createI18n(()=> 'vi');
  const html=notificationItemHtml({title:'<img src=x onerror=alert(1)>',body:'<script>alert(1)</script>',receiver_id:'x',data:{actors:[{name:'<svg onload=alert(1)>',avatarId:'fox'}]}},i18n);
  assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;img'));
  assert.equal(actorsFromItem({data:{actors:[{name:'An',avatarId:'fox'},{name:'an',avatarId:'panda'}]}}).length,1);
});

test('styles parse, with mobile filters and accessible focus states',()=>{
  const errors=[]; cssTree.parse(css,{onParseError:(err)=>errors.push(err.message)}); assert.deepEqual(errors,[]);
  assert.match(css,/\.lg-pagination/); assert.match(css,/:focus-visible/);
});

test('chronological controls: newest disables Next, Previous loads older, oldest disables Previous',async()=>{
  const f=fixture(makeItems(21)); await f.bell.open();
  const previous=()=>f.root().querySelector('[data-feed-action="previous"]');
  const next=()=>f.root().querySelector('[data-feed-action="next"]');
  assert.equal(next().disabled,true);
  assert.equal(previous().disabled,false);
  assert.match(previous().textContent,/Trước|Previous/);
  previous().click(); await tick();
  assert.equal(f.root().querySelector('.lg-item').dataset.receiver,'r10');
  assert.equal(next().disabled,false);
  previous().click(); await tick();
  assert.equal(f.root().querySelector('.lg-item').dataset.receiver,'r20');
  assert.equal(previous().disabled,true);
  assert.equal(next().disabled,false);
  next().click(); await tick();
  assert.equal(f.root().querySelector('.lg-item').dataset.receiver,'r10');
  f.dom.window.close();
});
