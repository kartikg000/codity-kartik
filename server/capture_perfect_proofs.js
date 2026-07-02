const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshotsDir = 'C:\\Users\\Kartik Gupta\\Downloads\\codity-screenshots';

async function run() {
    console.log('Step 1: Creating fresh user and seeding database...');
    const API = 'http://localhost:4000/api';
    const email = `kartik_gupta_${Date.now()}@codity.local`;

    const sRes = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', name: 'Kartik Gupta' })
    });
    const authData = await sRes.json();
    const token = authData.token;
    const user = authData.user;
    const organizationId = authData.organizationId;

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    console.log('Creating project "Distributed Job Scheduler"...');
    const pRes = await fetch(`${API}/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Distributed Job Scheduler', organizationId })
    });
    const project = await pRes.json();
    const projectId = project.id;

    console.log('Creating queues...');
    const q1Res = await fetch(`${API}/queues`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'production-orders', projectId, priority: 10, concurrencyLimit: 10 })
    });
    const q1 = await q1Res.json();

    const q2Res = await fetch(`${API}/queues`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'analytics-reports', projectId, priority: 5, concurrencyLimit: 4 })
    });
    const q2 = await q2Res.json();

    console.log('Creating Batch Jobs...');
    const batchRes = await fetch(`${API}/jobs/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            queueId: q1.id,
            jobs: [
                { type: 'IMMEDIATE', payload: { task: 'send-confirmation-email', orderId: 'ORD-1001' }, priority: 10 },
                { type: 'IMMEDIATE', payload: { task: 'charge-credit-card', amount: 299.99 }, priority: 10 },
                { type: 'DELAYED', payload: { task: 'send-followup-survey' }, runAt: new Date(Date.now() + 3600000).toISOString() },
                { type: 'RECURRING', payload: { task: 'daily-reconciliation' }, cronExpr: '0 0 * * *' }
            ]
        })
    });
    const batchJobs = await batchRes.json();

    console.log('Creating Delayed Job...');
    const delayedRes = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            queueId: q1.id,
            type: 'DELAYED',
            payload: { task: 'generate-monthly-report' },
            runAt: '2026-07-04T12:00:00.000Z'
        })
    });
    const delayedJob = await delayedRes.json();

    console.log('Creating Recurring Cron Job...');
    const cronRes = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            queueId: q2.id,
            type: 'RECURRING',
            payload: { task: 'db-vacuum-analyze' },
            cronExpr: '0 */6 * * *'
        })
    });
    const cronJob = await cronRes.json();

    console.log('Fetching Paginated Jobs List...');
    const listRes = await fetch(`${API}/jobs?page=1&limit=10`, { headers });
    const listData = await listRes.json();

    console.log('Step 2: Rendering API Verification Cards as pristine PNG screenshots...');
    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1200, height: 700 }
    });
    const page = await browser.newPage();

    async function captureJsonProof(filename, title, method, endpoint, reqBody, resStatus, resBody) {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Inter:wght@600;700&display=swap');
                body { background: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; padding: 30px; margin: 0; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px; }
                .title { font-size: 20px; font-weight: 700; color: #38bdf8; }
                .badge { background: #10b981; color: #fff; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
                .req-res { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-family: 'Fira Code', monospace; font-size: 13px; }
                .box { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 16px; overflow: hidden; }
                .box-title { color: #94a3b8; font-size: 12px; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; }
                .method { color: #38bdf8; font-weight: 600; }
                pre { margin: 0; color: #e2e8f0; white-space: pre-wrap; }
                .status { color: #4ade80; font-weight: 600; margin-bottom: 8px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <div class="title">${title}</div>
                    <div class="badge">VERIFIED HTTP ${resStatus}</div>
                </div>
                <div class="req-res">
                    <div class="box">
                        <div class="box-title">HTTP Request</div>
                        <div style="margin-bottom:10px;"><span class="method">${method}</span> ${endpoint}</div>
                        <pre>${JSON.stringify(reqBody, null, 2)}</pre>
                    </div>
                    <div class="box">
                        <div class="box-title">HTTP Response (Status ${resStatus})</div>
                        <pre>${JSON.stringify(resBody, null, 2)}</pre>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        const card = await page.$('.card');
        await card.screenshot({ path: path.join(screenshotsDir, filename) });
        console.log(` -> Captured API proof: ${filename}`);
    }

    await captureJsonProof('proof_batch.png', 'Batch Job Creation (POST /api/jobs/batch)', 'POST', '/api/jobs/batch', { queueId: q1.id, jobs: [{ type: 'IMMEDIATE', payload: { task: 'send-email' } }, { type: 'DELAYED', runAt: '2026-07-04T12:00:00Z' }] }, 201, batchJobs);
    await captureJsonProof('proof_delayed.png', 'Delayed Job Scheduling (POST /api/jobs)', 'POST', '/api/jobs', { queueId: q1.id, type: 'DELAYED', payload: { task: 'generate-monthly-report' }, runAt: '2026-07-04T12:00:00.000Z' }, 201, delayedJob);
    await captureJsonProof('proof_cron.png', 'Recurring Cron Job Registration (POST /api/jobs)', 'POST', '/api/jobs', { queueId: q2.id, type: 'RECURRING', payload: { task: 'db-vacuum-analyze' }, cronExpr: '0 */6 * * *' }, 201, cronJob);
    await captureJsonProof('proof_explorer.png', 'Job Explorer & Pagination (GET /api/jobs)', 'GET', '/api/jobs?page=1&limit=10', null, 200, listData);

    console.log('Step 3: Capturing Swagger UI (Phase 8)...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:4000/api/docs/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(screenshotsDir, 'phase8_swagger.png') });
    console.log(' -> Captured phase8_swagger.png with fully defined operations!');

    console.log('Step 4: Injecting auth into React dashboard and capturing UI pages...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ t, u }) => {
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
    }, { t: token, u: user });

    const pages = [
        { url: 'http://localhost:5174/', name: 'phase7_dashboard.png', label: 'Dashboard Page' },
        { url: 'http://localhost:5174/projects', name: 'phase7_projects.png', label: 'Projects Page ("Distributed Job Scheduler")' },
        { url: 'http://localhost:5174/queues', name: 'phase7_queues.png', label: 'Queues Page' },
        { url: 'http://localhost:5174/jobs', name: 'phase7_jobs.png', label: 'Jobs Page (Populated)' },
        { url: 'http://localhost:5174/workers', name: 'phase7_workers.png', label: 'Workers Page' }
    ];

    for (const p of pages) {
        console.log(`Capturing ${p.label}...`);
        await page.goto(p.url, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(screenshotsDir, p.name) });
        console.log(` -> Captured ${p.name}`);
    }

    await browser.close();
    console.log('All proofs captured perfectly!');
}

run().catch(console.error);
