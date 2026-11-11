// Optional visual review. Playwright runs in an isolated Chrome profile.
// Install once outside the repo: npm install --prefix "$env:TEMP/ftemation-ui-review" --no-save --package-lock=false playwright
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const moduleRoot =
    process.env.PLAYWRIGHT_REVIEW_ROOT ??
    path.join(tmpdir(), "ftemation-ui-review");
const { chromium } = createRequire(path.join(moduleRoot, "package.json"))(
    "playwright",
);
const baseline = process.argv.includes("--baseline");
const label = baseline ? "before" : "after";
const base = process.env.UI_BASE_URL ?? "http://localhost:8000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const env = await readFile(path.join(root, ".env"), "utf8");
const setting = (key) =>
    process.env[key] ??
    env
        .match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]
        .trim()
        .replace(/^(["'])(.*)\1$/, "$2");
const output = path.join(root, "storage/app/private/ui-review", label);
await mkdir(output, { recursive: true });
const failures = [];
const checks = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function reviewViewport(context, name, sessionState) {
    const page = await context.newPage();
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("response", (response) => {
        if (response.status() >= 500)
            failures.push(
                `HTTP ${response.status()}: ${new URL(response.url()).pathname}`,
            );
    });
    async function screenshot(view) {
        await page.screenshot({
            path: path.join(output, `${name}-${view}.png`),
            fullPage: true,
        });
        if (view === "activities") {
            await page.screenshot({
                path: path.join(output, `${name}-${view}-viewport.png`),
            });
        }
        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        assert.equal(
            overflow,
            false,
            `${name}/${view}: page has horizontal overflow`,
        );
        checks.push(`${name}/${view}: no horizontal overflow`);
    }
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    if (await page.locator("#password").count()) {
        await screenshot("login");
        if (sessionState) {
            // Reuse a real server-issued session for layout-only checks.
            // The dedicated session suite tests login separately on each viewport.
            await context.addCookies(sessionState.cookies);
            await page.reload({ waitUntil: "networkidle" });
        } else {
        await page
            .getByLabel("Email", { exact: true })
            .fill(setting("DEMO_EMAIL"));
        await page
            .getByLabel("Password", { exact: true })
            .fill(setting("DEMO_PASSWORD"));
        const [response] = await Promise.all([
            page.waitForResponse(response => new URL(response.url()).pathname === '/api/login'),
            page.getByRole("button", { name: /^Masuk$/ }).click(),
        ]);
        assert.equal(response.status(), 200, 'Demo login must succeed; inspect local rate limit if status is 429');
        }
    }
    await page.locator(".metrics").waitFor();
    await page.locator(".metric strong").first().waitFor();
    assert.equal(
        await page.locator(".workspace-title").textContent(),
        "Ruang kerja assessment",
    );
    assert.equal(await page.locator(".header-actions > .primary").count(), 0);
    assert.equal(await page.locator(".user-menu").count(), 1);
    assert.equal(await page.locator('.sidebar-logout').count(), 1);
    assert.equal(await page.locator('.topbar button').count(), 0);
    assert((await page.locator('.topbar').boundingBox()).height <= 64);
    assert.equal(await page.locator(".dataset-strip").count(), 0);
    checks.push(
        `${name}/overview: route title and requested header visibility`,
    );
    await screenshot("overview");

    await page
        .getByRole("link", { name: "Import dataset", exact: true })
        .click();
    await page
        .getByRole("heading", { name: "Import workbook Excel", exact: true })
        .waitFor();
    assert.equal(
        await page.locator(".workspace-title").textContent(),
        "Import dataset",
    );
    assert.equal(await page.locator(".user-menu").count(), 0);
    assert.equal(await page.locator('.header-actions > .primary').count(), 1);
    if (!baseline) {
        const refreshed = await page.reload({ waitUntil: "networkidle" });
        assert.equal(refreshed.status(), 200, `${name}/imports: refresh HTTP status`);
        await page.getByRole("heading", { name: "Import workbook Excel", exact: true }).waitFor();
        assert.equal(await page.locator(".workspace-title").textContent(), "Import dataset");
        checks.push(`${name}/imports: direct URL refresh preserves page`);
    }
    await screenshot("imports");
    if (!baseline) {
        await page.locator('input[type="file"]').setInputFiles({
            name: "invalid.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("invalid"),
        });
        await page.getByRole("button", { name: /Validasi & import/ }).click();
        await page
            .getByRole("alert")
            .filter({ hasText: "Pilih file .xlsx" })
            .waitFor();
        checks.push(
            `${name}/imports: invalid file gives actionable client error`,
        );
    }

    await page
        .getByRole("link", { name: "Data aktivitas", exact: true })
        .click();
    await page.locator("tbody tr").first().waitFor();
    assert.equal(
        await page.locator(".workspace-title").textContent(),
        "Data aktivitas",
    );
    assert.equal(await page.locator(".user-menu").count(), 0);
    assert.equal(await page.locator('.header-actions > .primary').count(), 0);
    if (!baseline) {
        const refreshed = await page.reload({ waitUntil: "networkidle" });
        assert.equal(refreshed.status(), 200, `${name}/activities: refresh HTTP status`);
        await page.locator("tbody tr").first().waitFor();
        assert.equal(await page.locator(".workspace-title").textContent(), "Data aktivitas");
        checks.push(`${name}/activities: direct URL refresh preserves page`);
    }
    await screenshot("activities");
    if (!baseline) {
        await page.getByRole("button", { name: /Berikutnya/ }).click();
        await page.waitForFunction(() =>
            document
                .querySelector("tbody tr")
                ?.textContent.includes("ACT-0021"),
        );
        await page.getByRole("button", { name: /Sebelumnya/ }).click();
        await page.waitForFunction(() =>
            document
                .querySelector("tbody tr")
                ?.textContent.includes("ACT-0001"),
        );
        checks.push(`${name}/activities: pagination changes dataset rows`);

        await page
            .locator(".filters select")
            .first()
            .selectOption("Operations");
        await page.waitForFunction(() =>
            document
                .querySelector("tbody tr")
                ?.textContent.includes("ACT-0041"),
        );
        await page.locator(".filters select").last().selectOption("daily");
        await page.waitForResponse(
            (response) =>
                response.url().includes("/activities?") &&
                new URL(response.url()).searchParams.get("frequency") ===
                    "daily",
        );
        await page.locator("tbody tr").first().waitFor();
        const frequencies = await page
            .locator("tbody tr td:nth-child(3)")
            .allTextContents();
        assert(
            frequencies.length > 0 &&
                frequencies.every((text) => text.trim() === "daily"),
        );
        checks.push(`${name}/activities: department and frequency filters`);
        await page.locator(".filters select").first().selectOption("");
        await page.locator(".filters select").last().selectOption("");
        await page.waitForFunction(() =>
            document
                .querySelector("tbody tr")
                ?.textContent.includes("ACT-0001"),
        );

        await page.getByRole("searchbox").fill("ACT-0001");
        await page.waitForResponse(
            (response) =>
                response.url().includes("/activities?") &&
                new URL(response.url()).searchParams.get("search") ===
                    "ACT-0001",
        );
        await page.locator("tbody tr").first().waitFor();
        assert.equal(await page.locator("tbody tr").count(), 1);
        assert.match(await page.locator("tbody").textContent(), /0,1875/);
        await page.locator("details summary").first().click();
        assert(
            await page
                .locator("details")
                .first()
                .evaluate((el) => el.open),
        );
        checks.push(`${name}/activities: search and expandable FTE detail`);
        await page.evaluate(() =>
            window.scrollTo(0, document.documentElement.scrollHeight),
        );
        await page.waitForTimeout(150);
        assert(
            Math.abs(
                await page
                    .locator(".topbar")
                    .evaluate((el) => el.getBoundingClientRect().top),
            ) <= 1,
        );
        checks.push(`${name}/header: stays at top on scroll`);
    }
    await page.close();
}

try {
    const desktop = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
    });
    await reviewViewport(desktop, "desktop");
    const sessionState = await desktop.storageState();
    // Capture guest login first, then use the verified session for layout checks.
    const mobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
    });
    await reviewViewport(mobile, "mobile", sessionState);
    const tablet = await browser.newContext({
        viewport: { width: 900, height: 1000 },
        reducedMotion: "reduce",
    });
    await reviewViewport(tablet, "tablet", sessionState);
    if (!baseline) {
        const wide = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            storageState: await desktop.storageState(),
        });
        const page = await wide.newPage();
        await page.goto(`${base}/`, { waitUntil: "networkidle" });
        await page.locator(".metrics").waitFor();
        const title = await page.locator(".workspace-title").boundingBox();
        const metric = await page.locator(".metric").first().boundingBox();
        assert(
            Math.abs(title.x - metric.x) < 1,
            "wide overview: header and content must align",
        );
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
        );
        await page.screenshot({
            path: path.join(output, "wide-overview.png"),
            fullPage: true,
        });
        checks.push("wide/overview: header/content aligned, no overflow");
    }
    assert.equal(
        failures.length,
        0,
        `Runtime/server failures: ${failures.join("; ")}`,
    );
    await writeFile(
        path.join(output, "report.json"),
        JSON.stringify({ label, checks, failures }, null, 2) + "\n",
    );
    console.log(
        JSON.stringify({
            label,
            checks: checks.length,
            runtimeErrors: failures.length,
            screenshots: output,
        }),
    );
} finally {
    await browser.close();
}
