const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.map':'application/json','.svg':'image/svg+xml' };
function serve(root, port) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let fp = path.join(root, p);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(path.join(root, 'index.html')).pipe(res);
    }
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

const MEMBER = JSON.stringify({ id: 'local-demo', name: '김성도', role: 'member' });
const ADMIN = JSON.stringify({ id: 'local-admin', name: '관리자', role: 'admin' });

async function newCtx(browser, userJson, withPrayer) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 866 }, deviceScaleFactor: 2 });
  if (userJson) {
    await ctx.addInitScript((u) => {
      try { window.localStorage.setItem('church-app/local-user', u); } catch (e) {}
    }, userJson);
  }
  if (withPrayer) {
    await ctx.addInitScript(() => {
      try {
        const pad = (n) => String(n).padStart(2, '0');
        const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const mk = (arr) => arr.map((m, i) => { const d = new Date(); d.setDate(d.getDate() - i); return { date: key(d), minutes: m }; }).filter((e) => e.minutes > 0);
        window.localStorage.setItem('church-app/prayer-log', JSON.stringify(mk([35, 50, 0, 60, 25, 45, 40, 20, 55, 30, 15, 40])));
        window.localStorage.setItem('church-app/communal-prayer-log', JSON.stringify(mk([20, 0, 30, 15, 0, 25, 10, 0, 20, 15])));
      } catch (e) {}
    });
  }
  return ctx;
}

async function shot(page, base, route, name, opts = {}) {
  try {
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 20000 });
  } catch (e) { console.log('goto slow', route, e.message); }
  await page.waitForTimeout(opts.wait || 2600);
  if (opts.before) { try { await opts.before(page); } catch (e) { console.log('before fail', name, e.message); } }
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('shot', name);
}

(async () => {
  const distDir = process.argv[2] || '/home/user/first-repository/dist';
  const remDir = process.argv[3] || '/home/user/first-repository/dist-rem';
  const s1 = await serve(distDir, 8231);
  const s2 = await serve(remDir, 8232);
  const base = 'http://127.0.0.1:8231';
  const rbase = 'http://127.0.0.1:8232';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

  // ── Guest pass: welcome ──
  {
    const ctx = await newCtx(browser, null);
    const page = await ctx.newPage();
    await shot(page, base, '/', 'welcome', { wait: 2600 });
    await ctx.close();
  }

  // ── Member pass: content screens ──
  {
    const ctx = await newCtx(browser, MEMBER, true);
    const page = await ctx.newPage();
    await shot(page, base, '/', 'home');
    await shot(page, base, '/news', 'news');
    await shot(page, base, '/sermons', 'sermons');
    await shot(page, base, '/prayer', 'prayer_personal', { wait: 3200 });
    // 기도 화면 아래쪽 (10일 평균 + 기도 시작 + 기도 알림 카드)
    await shot(page, base, '/prayer', 'prayer_bottom', { wait: 3000, before: async (p) => {
      await p.mouse.move(200, 450);
      for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, 260); await p.waitForTimeout(200); }
      await p.waitForTimeout(1000);
    }});
    // 공동 토글
    await shot(page, base, '/prayer', 'prayer_communal', { wait: 3000, before: async (p) => {
      await p.getByText('공동 기도', { exact: true }).first().click({ timeout: 5000 });
      await p.waitForTimeout(1600);
    }});
    await shot(page, base, '/groups', 'groups');
    await shot(page, base, '/services', 'services');
    await shot(page, base, '/staff', 'staff');
    await shot(page, base, '/location', 'location');
    await shot(page, base, '/giving', 'giving');
    await shot(page, base, '/bulletins', 'bulletins');
    await shot(page, base, '/new-family', 'new_family');
    await shot(page, base, '/prayer/personal', 'prayer_topics');
    await shot(page, base, '/prayer/requests', 'prayer_requests');
    await shot(page, base, '/settings', 'settings');
    await ctx.close();
  }

  // ── Admin pass ──
  {
    const ctx = await newCtx(browser, ADMIN);
    const page = await ctx.newPage();
    await shot(page, base, '/admin', 'admin_home');
    await shot(page, base, '/admin/announcement/new', 'admin_announcement');
    await shot(page, base, '/admin/new-families', 'admin_newfamilies');
    await ctx.close();
  }

  // ── Reminders pass (dist-rem, guest click flow) ──
  {
    const ctx = await newCtx(browser, null);
    const page = await ctx.newPage();
    try {
      await page.goto(rbase + '/', { waitUntil: 'networkidle', timeout: 20000 });
    } catch (e) { console.log('rem goto', e.message); }
    await page.waitForTimeout(2500);
    try { await page.getByText('손님으로 둘러보기', { exact: true }).click({ timeout: 6000 }); } catch (e) { console.log('guest click', e.message); }
    await page.waitForTimeout(2500);
    // 기도 탭 (하단 4번째)
    try { await page.mouse.click(280, 838); } catch (e) {}
    await page.waitForTimeout(2500);
    // 기도 알림 카드로 이동 시도
    try { await page.getByText('기도 알림', { exact: false }).first().click({ timeout: 5000 }); } catch (e) { console.log('reminder card', e.message); }
    await page.waitForTimeout(2600);
    await page.screenshot({ path: path.join(OUT, 'reminders.png') });
    console.log('shot reminders');
    await ctx.close();
  }

  await browser.close();
  s1.close(); s2.close();
  console.log('DONE');
})();
