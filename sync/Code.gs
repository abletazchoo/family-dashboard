/**
 * 우리집 가족 대시보드 — 암호화 클라우드 동기화 (urijip-sync)
 *
 * · 이 스크립트는 브라우저가 PIN으로 AES-256-GCM 암호화한 문자열(enc)만 보관합니다.
 *   평문 가족 정보는 여기에 저장되지 않습니다(이 파일에도 없습니다).
 * · 저장 위치: 스크립트 속성(PropertiesService). 한 속성은 9KB까지만 넣을 수 있어
 *   8000자씩 나눠 담습니다.
 * · 배포: 웹 앱 · 실행 주체: 나 · 액세스 권한: 모든 사용자
 */

const PROP_HEAD = 'urijip_sync_head';   // { v, updatedAt, chunks }
const PROP_CHUNK = 'urijip_sync_c';     // urijip_sync_c0, c1, ...
const APP_TOKEN = 'urijip-2026-h1-7f3c9a';
const CHUNK_SIZE = 8000;

function doGet(e) {
  if (!tokenOk_(e && e.parameter && e.parameter.t)) return out_({ ok: false, error: 'forbidden' });
  var s = readState_();
  return out_({ ok: true, v: s.v, updatedAt: s.updatedAt, enc: s.enc });
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { body = {}; }
  if (!tokenOk_(body.t)) return out_({ ok: false, error: 'forbidden' });
  var cur = readState_();
  var incoming = {
    v: Number(body.v) || 1,
    updatedAt: Number(body.updatedAt) || 0,
    enc: typeof body.enc === 'string' ? body.enc : ''
  };
  if (!incoming.enc) return out_({ ok: true, v: cur.v, updatedAt: cur.updatedAt, enc: cur.enc });
  // 더 새로운 것만 덮어씁니다(늦게 깨어난 기기가 최신 기록을 지우지 않도록).
  if (incoming.updatedAt >= (cur.updatedAt || 0)) {
    writeState_(incoming);
    return out_({ ok: true, v: incoming.v, updatedAt: incoming.updatedAt, enc: incoming.enc });
  }
  return out_({ ok: true, v: cur.v, updatedAt: cur.updatedAt, enc: cur.enc });
}

function tokenOk_(t) {
  return typeof t === 'string' && t === APP_TOKEN;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readState_() {
  var props = PropertiesService.getScriptProperties();
  var head = props.getProperty(PROP_HEAD);
  if (!head) return { v: 0, updatedAt: 0, enc: '' };
  var meta;
  try { meta = JSON.parse(head); } catch (err) { return { v: 0, updatedAt: 0, enc: '' }; }
  var n = Number(meta.chunks) || 0;
  var parts = [];
  for (var i = 0; i < n; i++) parts.push(props.getProperty(PROP_CHUNK + i) || '');
  return { v: Number(meta.v) || 0, updatedAt: Number(meta.updatedAt) || 0, enc: parts.join('') };
}

function writeState_(state) {
  var props = PropertiesService.getScriptProperties();
  var enc = state.enc || '';
  var chunks = Math.ceil(enc.length / CHUNK_SIZE);
  var prevChunks = 0;
  try { prevChunks = Number(JSON.parse(props.getProperty(PROP_HEAD) || '{}').chunks) || 0; } catch (err) { prevChunks = 0; }

  var next = {};
  for (var i = 0; i < chunks; i++) next[PROP_CHUNK + i] = enc.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
  next[PROP_HEAD] = JSON.stringify({ v: state.v, updatedAt: state.updatedAt, chunks: chunks });
  props.setProperties(next, false);

  for (var j = chunks; j < prevChunks; j++) {
    try { props.deleteProperty(PROP_CHUNK + j); } catch (err) { }
  }
}
