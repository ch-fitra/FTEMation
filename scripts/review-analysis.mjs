import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
const root = process.cwd();
const { chromium } = createRequire(
    path.join(tmpdir(), "ftemation-ui-review/package.json"),
)("playwright");
const env = await readFile(".env", "utf8");
const setting = (key) =>
    env
        .match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]
        .trim()
        .replace(/^"(.*)"$/, "$1");
const out = path.join(root, "storage/app/private/ui-review/analysis");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [],
    checks = [];
try {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:8000", { waitUntil: "networkidle" });
    await page
        .getByLabel("Username", { exact: true })
        .fill(setting("DEMO_USERNAME"));
    await page
        .getByLabel("Password", { exact: true })
        .fill(setting("DEMO_PASSWORD"));
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await page.locator(".workspace-title").waitFor();
    await page
        .getByRole("link", { name: "Analisis AI", exact: true })
        .first()
        .click();
    await page
        .getByRole("heading", { name: "Hasil analisis", exact: true })
        .waitFor();
    assert.equal(await page.locator("tbody tr").count(), 60);
    checks.push("60 AI activities rendered");
    for (const tab of [
        "Grouping",
        "Karyawan",
        "Departemen",
        "Seluruh aktivitas",
        "Prioritas",
    ]) {
        await page.getByRole("button", { name: tab, exact: true }).click();
        const expected = { Grouping: 20, Karyawan: 12, Departemen: 3 }[tab];
        if (expected)
            assert.equal(
                await page.locator(".analysis-cards article").count(),
                expected,
            );
        checks.push(`${tab} tab`);
    }
    await page
        .getByLabel("Peluang otomatisasi", { exact: true })
        .selectOption("high");
    assert.equal(await page.locator("tbody tr").count(), 21);
    await page
        .getByLabel("Peluang otomatisasi", { exact: true })
        .selectOption("");
    await page.getByLabel("Cari hasil", { exact: true }).fill("ACT-0001");
    assert.equal(await page.locator("tbody tr").count(), 1);
    await page.getByLabel("Cari hasil", { exact: true }).fill("");
    checks.push("Search and level filters");
    for (const [button, extension] of [
        ["results.json", "json"],
        ["XLSX", "xlsx"],
        ["PDF", "pdf"],
    ]) {
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: button, exact: true }).click();
        await (await download).saveAs(path.join(out, `download.${extension}`));
        checks.push(`Authenticated ${extension} download`);
    }
    await page.reload({ waitUntil: "networkidle" });
    await page
        .getByRole("heading", { name: "Hasil analisis", exact: true })
        .waitFor();
    checks.push("Direct /analysis refresh");
    for (const [width, height] of [
        [1440, 900],
        [768, 1024],
        [390, 844],
        [320, 740],
    ]) {
        await page.setViewportSize({ width, height });
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `Horizontal overflow at ${width}`,
        );
        await page.screenshot({
            path: path.join(out, `analysis-${width}.png`),
            fullPage: false,
        });
        checks.push(`Responsive ${width}px`);
    }
    assert.deepEqual(errors, []);
    await writeFile(
        path.join(out, "checks.json"),
        JSON.stringify(checks, null, 2),
    );
    console.log(JSON.stringify({ checks: checks.length, details: checks }));
} finally {
    await browser.close();
}
