'use strict';

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SSI = 'window.__QM_STATUS = <!--# echo var="status" default="0" -->;';

function fileFor(status) {
  return String(status).startsWith('5') ? '50x.html' : '40x.html';
}

function render(status) {
  const code = Number(status) || 0;
  const raw = fs.readFileSync(path.join(DIR, fileFor(code)), 'utf8');
  const line = `window.__QM_STATUS = ${code};`;
  return raw.includes(SSI) ? raw.replace(SSI, line) : raw;
}

function wantsHtml(req) {
  const accept = String((req && (req.get ? req.get('accept') : req.headers && req.headers.accept)) || '');
  if (accept.includes('text/html')) return true;
  return false;
}

function send(res, status) {
  const code = Number(status) || 404;
  res.status(code);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.send(render(code));
}

module.exports = { render, send, wantsHtml, fileFor };
