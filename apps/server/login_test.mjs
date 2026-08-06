#!/usr/bin/env node
/**
 * 完整登录测试脚本
 * 用法: node login_test.mjs [admin|test|demo]
 *
 * 流程:
 *   1. GET  /auth/code        → 拿到 uuid + 验证码图片
 *   2. 解析验证码答案 (通过 Redis 或 svg-captcha 本地计算)
 *   3. POST /login            → 用 uuid + code + 账号密码登录
 */

import { execSync } from 'child_process';
import { createRequire } from 'module';
import net from 'net';
import http from 'http';
import https from 'https';

const require = createRequire(import.meta.url);

// ===== 账号配置 =====
const ACCOUNTS = {
  admin: { userName: 'admin', password: 'admin123' },
  test:  { userName: 'test',  password: 'admin123' },
  demo:  { userName: 'demo',  password: 'demo123' },
};

const account = process.argv[2] || 'admin';
const creds = ACCOUNTS[account];
if (!creds) {
  console.log('用法: node login_test.mjs [admin|test|demo]');
  process.exit(1);
}

const BASE = 'http://localhost:8080/api/v1';

// ===== 工具函数 =====
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error(d.slice(0, 300))); } });
    }).on('error', reject);
  });
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const opts = { hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const req = mod.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error(d.slice(0, 300))); } });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

/** 通过 docker exec 查 Redis 中的验证码答案 */
async function getCaptchaAnswerFromRedis(uuid) {
  try {
    // 获取 Redis 容器 ID
    const containerId = execSync("docker ps -q -f name=redis").toString().trim();
    if (!containerId) return null;
    const key = `captcha_codes:${uuid}`;
    const val = execSync(`docker exec -it ${containerId} redis-cli GET "${key}"`).toString().trim();
    return val || null;
  } catch {
    return null;
  }
}

/** 本地用 svg-captcha 计算验证码答案（和服务器同一份逻辑） */
function computeCaptchaAnswerLocally() {
  try {
    const svgCaptcha = require('svg-captcha');
    const result = svgCaptcha.createMathExpr({
      charPreset: '0123456789QWERTYUIOPSDFGHJKLAZXCVBNMzxcvbnmasdfghjklqwertyuiop',
      size: 4, width: 100, height: 40, noise: 2, background: '#ffffff',
      rotate: 15, mathMin: 1, mathMax: 50, mathOperator: '+',
    });
    return { text: result.text, data: result.data };
  } catch {
    return null;
  }
}

// ===== 主流程 =====
async function main() {
  console.log('================================');
  console.log('  账号密码登录测试');
  console.log(`  账号: ${creds.userName}`);
  console.log('================================\n');

  // ---- Step 1: 获取验证码 ----
  console.log('[Step 1] GET /auth/code');
  const codeResp = await httpGet(`${BASE}/auth/code`);
  if (codeResp.code !== 200) {
    console.error('  获取验证码失败:', JSON.stringify(codeResp));
    process.exit(1);
  }
  const { uuid, img, captchaEnabled } = codeResp.data;
  console.log(`  uuid      : ${uuid}`);
  console.log(`  captchaEnabled: ${captchaEnabled}`);
  console.log(`  img (前120字符): ${img.slice(0, 120)}...\n`);

  // ---- Step 2: 获取验证码答案 ----
  console.log('[Step 2] 获取验证码答案');

  // 方式 A: 从 Redis 读取（和服务器用同一份 key）
  let answer = await getCaptchaAnswerFromRedis(uuid);
  if (answer) {
    console.log(`  ✅ 从 Redis 读取到答案: "${answer}"`);
  } else {
    console.log('  ⚠ Redis 中未找到（可能 Redis 未运行或 key 已过期），改为本地计算...');
    // 方式 B: 本地模拟服务器生成逻辑（概率性匹配，仅用于测试）
    const local = computeCaptchaAnswerLocally();
    if (local) {
      answer = local.text;
      console.log(`  📐 本地计算结果: "${answer}"（注意：本地计算值可能与服务器不一致！）`);
    }
  }

  if (!answer) {
    console.error('  ❌ 无法获取验证码答案，终止');
    process.exit(1);
  }
  console.log('');

  // ---- Step 3: 执行登录 ----
  console.log(`[Step 3] POST /login  (userName="${creds.userName}", code="${answer}", uuid="${uuid}")`);
  const loginResp = await httpPost(`${BASE}/login`, {
    code: answer,
    userName: creds.userName,
    password: creds.password,
    uuid,
  });

  const pretty = JSON.stringify(loginResp, null, 2)
    .replace(/\\u([\d+a-f]{4})/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  console.log(pretty);
  console.log('');

  if (loginResp.code === 200) {
    console.log('✅ 登录成功!');
    const token = loginResp.data?.access_token;
    if (token) console.log(`  Token: ${token.slice(0, 70)}...`);
  } else {
    console.log(`❌ 登录失败: ${loginResp.msg}  (code=${loginResp.code})`);
    if (loginResp.msg?.includes('验证码')) {
      console.log('  💡 提示: Redis 中可能已无该 uuid 对应的验证码（已过期），');
      console.log('     或本地计算答案与服务器不一致。');
      console.log('     请直接在前端页面使用图形验证码登录（会实时从后端拿 uuid）。');
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
