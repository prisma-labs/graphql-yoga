import { execSync, spawn } from 'child_process';
import puppeteer from 'puppeteer';

let browser: puppeteer.Browser;
let page: puppeteer.Page;
let sveltekitProcess: ReturnType<typeof spawn>;

const timings = {
	setup: {
		waitAfterPreview: 5000,
		total: 20000 // build + preview + {waitAfterPreview} is expected to be less than 20sec
	},
	waitForSelector: 999,
	waitForResponse: 1999
};
let toSkip = false;

describe('SvelteKit integration', () => {
	beforeAll(async () => {
		console.time('Setup SvelteKit tests');

		const nodeVersion = execSync('node -v').toString();
		if (nodeVersion.includes('v12')) {
			toSkip = true;
		}

		if (!toSkip) {
			// Kill the port if it's used!
			try {
				execSync('fuser -k 3007/tcp');
			} catch (error) {}

			// Build svelteKit
			execSync('yarn workspace sveltekit build');

			// Start sveltekit
			sveltekitProcess = spawn('yarn', ['workspace', 'sveltekit', 'preview']);

			// Wait for sveltekit to start
			await new Promise((resolve) => setTimeout(resolve, timings.setup.waitAfterPreview));

			// Launch puppeteer
			browser = await puppeteer.launch({
				// If you wanna run tests with open browser
				// set your PUPPETEER_HEADLESS env to "false"
				headless: process.env.PUPPETEER_HEADLESS !== 'false',
				args: ['--incognito']
			});
		}

		// How long it took?
		console.timeEnd('Setup SvelteKit tests');
	}, timings.setup.total);

	beforeEach(async () => {
		if (!toSkip) {
			if (page !== undefined) {
				await page.close();
			}
			const context = await browser.createIncognitoBrowserContext();
			page = await context.newPage();
		}
	});

	afterAll(async () => {
		if (!toSkip) {
			await browser.close();
			sveltekitProcess.kill();
		}
	});

	it('index page is showing h1', async () => {
		if (!toSkip) {
			await page.goto('http://localhost:3007/');
			const element = await page.waitForSelector('h1', { timeout: timings.waitForSelector });
			expect(await element?.evaluate((el) => el.textContent)).toBe(
				'Welcome to SvelteKit - GraphQL Yoga'
			);
		}
	});

	it('go to GraphiQL page', async () => {
		if (!toSkip) {
			// Go the the right route
			const body = await page.goto(
				'http://localhost:3007/api/graphql?query=query+Hello+%7B%0A%09hello%0A%7D'
			);
			const bodyContent = await body?.text();

			// 1/ Check that GraphiQL is showing
			expect(bodyContent).toContain(
				`renderYogaGraphiQL(root,{\"endpoint\":\"/api/graphql\",\"defaultQuery\":\"query Hello {\\n\\thello\\n}\"})`
			);

			// 2/ Tigger the default request and wait for the response
			const [res] = await Promise.all([
				page.waitForResponse((res) => res.url().endsWith('/api/graphql'), {
					timeout: timings.waitForResponse
				}),
				page.click(`button[class="execute-button"]`)
			]);

			const json = await res.json();
			const str = JSON.stringify(json, null, 0);
			expect(str).toContain(`{"data":{"hello":"SvelteKit - GraphQL Yoga"}}`);
		}
	});
});
