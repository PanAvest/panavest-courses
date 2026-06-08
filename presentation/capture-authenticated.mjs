#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";

const email = process.env.PANAVEST_EMAIL;
const password = process.env.PANAVEST_PASSWORD;
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const cdpPort = Number(process.env.CDP_PORT || "9222");
const outDir = process.env.OUT_DIR || path.join(process.cwd(), "presentation/assets/screens");

if (!email || !password) {
  throw new Error("Missing PANAVEST_EMAIL or PANAVEST_PASSWORD environment variable.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getPageWebSocketUrl() {
  const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
  if (!response.ok) {
    throw new Error(`Could not reach Chrome DevTools on port ${cdpPort}`);
  }
  const targets = await response.json();
  const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  if (!page) {
    throw new Error("No debuggable Chrome page target found.");
  }
  return page.webSocketDebuggerUrl;
}

async function connect(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  const pending = new Map();
  const events = new Map();
  let id = 0;

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (typeof message.id === "number") {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message || "CDP error"));
      else entry.resolve(message.result);
      return;
    }

    const handlers = events.get(message.method) || [];
    handlers.forEach((handler) => handler(message.params || {}));
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", (error) => reject(error), { once: true });
  });

  function on(method, handler) {
    const list = events.get(method) || [];
    list.push(handler);
    events.set(method, list);
    return () => {
      const current = events.get(method) || [];
      events.set(
        method,
        current.filter((entry) => entry !== handler),
      );
    };
  }

  function send(method, params = {}) {
    const messageId = ++id;
    const payload = { id: messageId, method, params };
    ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      pending.set(messageId, { resolve, reject });
    });
  }

  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return result.result?.value;
  }

  async function waitFor(expression, { timeoutMs = 30000, intervalMs = 300 } = {}) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const passed = await evaluate(expression);
      if (passed) return passed;
      await sleep(intervalMs);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  }

  async function navigate(url) {
    await send("Page.navigate", { url });
  }

  async function capture(fileName) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await fs.writeFile(path.join(outDir, fileName), Buffer.from(result.data, "base64"));
  }

  async function close() {
    ws.close();
  }

  return { on, send, evaluate, waitFor, navigate, capture, close };
}

const wsUrl = await getPageWebSocketUrl();
const cdp = await connect(wsUrl);

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("DOM.enable");
await cdp.send("Network.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1900,
  deviceScaleFactor: 1,
  mobile: false,
});

await cdp.navigate(`${baseUrl}/dashboard`);
await sleep(2200);

let currentPath = await cdp.evaluate(`location.pathname`);
if (currentPath !== "/dashboard") {
  await cdp.navigate(`${baseUrl}/auth/sign-in`);
  await cdp.waitFor(
    `(() => !!document.querySelector('input[type="email"]') && !!document.querySelector('input[type="password"]') && !!document.querySelector('button[type="submit"]'))()`,
    { timeoutMs: 30000 },
  );
  await sleep(1800);

  await cdp.evaluate(`(() => {
    const setValue = (el, value) => {
      if (!el) return;
      const proto = Object.getPrototypeOf(el);
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value') ||
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      descriptor.set.call(el, value);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    };

    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const submitButton = document.querySelector('button[type="submit"]');
    const form = emailInput?.closest('form');

    setValue(emailInput, ${JSON.stringify(email)});
    setValue(passwordInput, ${JSON.stringify(password)});

    if (!submitButton) {
      return { ok: false, reason: 'submit button missing' };
    }

    if (form && typeof form.requestSubmit === 'function') {
      form.requestSubmit(submitButton);
    } else {
      submitButton.click();
    }

    return {
      ok: true,
      emailValue: emailInput?.value || '',
      passwordLength: passwordInput?.value?.length || 0,
      buttonText: submitButton.textContent || ''
    };
  })()`);

  try {
    await cdp.waitFor(`location.pathname === '/dashboard'`, { timeoutMs: 40000 });
  } catch {
    const maybeSession = await cdp.evaluate(`(() => ({
      path: location.pathname,
      hasSignOut: document.body.innerText.includes('Sign Out'),
      hasDashboardLink: document.body.innerText.includes('Dashboard'),
      error: document.querySelector('[class*="text-red"]')?.textContent || '',
      body: document.body.innerText.slice(0, 1200),
    }))()`);

    if (maybeSession.hasSignOut || maybeSession.hasDashboardLink) {
      await cdp.navigate(`${baseUrl}/dashboard`);
      await sleep(2000);
    } else {
      throw new Error(`Sign-in did not reach dashboard. ${JSON.stringify(maybeSession)}`);
    }
  }
}

currentPath = await cdp.evaluate(`location.pathname`);
if (currentPath !== "/dashboard") {
  throw new Error(`Unexpected path after sign-in flow: ${currentPath}`);
}
await cdp.waitFor(
  `(() => !document.body.innerText.includes('Loading…') && document.body.innerText.includes('Certificates'))()`,
  { timeoutMs: 40000 },
);

await cdp.evaluate(`window.scrollTo(0, 0)`);
await sleep(1500);
await cdp.capture("dashboard-auth.png");

const certState = await cdp.evaluate(`(() => {
  const section = [...document.querySelectorAll('section')].find((node) => {
    const heading = node.querySelector('h2');
    return /certificates/i.test(heading?.textContent || '');
  });

  if (!section) {
    return { found: false, reason: 'section missing' };
  }

  section.scrollIntoView({ block: 'start' });
  const details = section.querySelector('details');
  if (details) details.open = true;

  return {
    found: true,
    openedPreview: Boolean(details),
    summary: section.innerText.slice(0, 600),
  };
})()`);

await sleep(2000);
await cdp.capture("certificate-auth.png");

const dashboardState = await cdp.evaluate(`(() => ({
  path: location.pathname,
  title: document.title,
  sample: document.body.innerText.slice(0, 800),
}))()`);

console.log(JSON.stringify({ dashboardState, certState }, null, 2));
await cdp.close();
