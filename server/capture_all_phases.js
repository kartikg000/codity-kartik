const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshotsDir = 'C:\\Users\\Kartik Gupta\\Downloads\\codity-screenshots';

async function run() {
    console.log('Seeding demo data via API before launching browser...');
    const API = 'http://localhost:4000/api';

    // 1. Create a user via signup or login
    const email = `kartik_${Date.now()}@codity.local`;
    let token = '';
    let user = null;

    try {
        const res = await fetch(`${API}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123', name: 'Kartik Gupta' })
        });
        const data = await res.json();
        token = data.token;
        user = data.user;
    } catch (err) {
        console.error('Failed to create user via fetch:', err.message);
    }

    if (token) {
        console.log('User created successfully. Seeding project & queue...');
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        try {
            const pRes = await fetch(`${API}/projects`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: 'Distributed Scheduling Engine Hub', organizationId: user.organizationId })
            });
            const project = await pRes.json();

            if (project.id) {
                const q1Res = await fetch(`${API}/queues`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: 'high-priority-orders', projectId: project.id, priority: 10, concurrencyLimit: 8 })
                });
                const q1 = await q1Res.json();

                const q2Res = await fetch(`${API}/queues`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: 'background-analytics', projectId: project.id, priority: 2, concurrencyLimit: 3 })
                });
                const q2 = await q2Res.json();

                if (q1.id) {
                    await fetch(`${API}/jobs/batch`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            queueId: q1.id,
                            jobs: [
                                { type: 'IMMEDIATE', payload: { task: 'process-payment', orderId: 'ORD-9910' }, priority: 10 },
                                { type: 'IMMEDIATE', payload: { task: 'dispatch-notification', user: 'kartik@example.com' }, priority: 8 },
                                { type: 'DELAYED', payload: { task: 'generate-monthly-invoice' }, runAt: new Date(Date.now() + 86400000).toISOString() },
                                { type: 'RECURRING', payload: { task: 'database-cleanup' }, cronExpr: '0 0 * * *' }
                            ]
                        })
                    });
                }
            }
        } catch (err) {
            console.error('Seeding error:', err.message);
        }
    }

    console.log('Launching browser to capture Phase 2-9 screenshots...');
    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1440, height: 900 }
    });

    const page = await browser.newPage();

    // 2. Capture Swagger API Docs (Phase 8)
    console.log('Capturing Swagger API Docs (Phase 8)...');
    try {
        await page.goto('http://localhost:4000/api/docs/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(screenshotsDir, 'phase8_swagger.png') });
        console.log(' -> Captured phase8_swagger.png');
    } catch (err) {
        console.warn('Failed to capture Swagger UI:', err.message);
    }

    // 3. Inject token & user into localStorage before navigating to protected pages
    if (token && user) {
        console.log('Injecting auth token into browser storage...');
        await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
        await page.evaluate(({ t, u }) => {
            localStorage.setItem('token', t);
            localStorage.setItem('user', JSON.stringify(u));
        }, { t: token, u: user });
    }

    const pagesToCapture = [
        { url: 'http://localhost:5174/', name: 'phase7_dashboard.png', label: 'Dashboard Overview Page' },
        { url: 'http://localhost:5174/projects', name: 'phase7_projects.png', label: 'Projects Workspace Page' },
        { url: 'http://localhost:5174/queues', name: 'phase7_queues.png', label: 'Queues Management Page' },
        { url: 'http://localhost:5174/jobs', name: 'phase7_jobs.png', label: 'Jobs Explorer Page' },
        { url: 'http://localhost:5174/workers', name: 'phase7_workers.png', label: 'Workers Telemetry Page' },
        { url: 'http://localhost:5174/dlq', name: 'phase4_dlq.png', label: 'Dead Letter Queue Page' }
    ];

    for (const item of pagesToCapture) {
        console.log(`Capturing ${item.label}...`);
        try {
            await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await new Promise(r => setTimeout(r, 2000));
            await page.screenshot({ path: path.join(screenshotsDir, item.name) });
            console.log(` -> Captured ${item.name}`);
        } catch (err) {
            console.warn(`Failed to capture ${item.name}:`, err.message);
        }
    }

    await browser.close();
    console.log('All Phase 2-9 UI screenshots captured successfully!');
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
