# Mobile navigation — 12 November 2026

## Scope

Mobile navigation applies at widths up to 650px. The existing tablet header navigation (including 768px) and desktop sidebar remain unchanged. The six-link mobile header is hidden and replaced with five persistent bottom links: Import dataset, Analisis AI, Overview, Hasil analisis, Data aktivitas. Overview has a larger raised navy icon with a cyan active state.

`MobileNavigation.tsx` reuses the existing navigation metadata, icons, routes, selected dataset, and logout confirmation. The compact brand header contains a disclosure for Pusat Bantuan and Keluar. Outside pointer interaction, Escape, focus leaving the disclosure, selecting an item, route changes, and resizing to tablet close it. Escape returns focus to the trigger.

Vanilla CSS reserves bottom space for the entire page, uses safe-area insets, and includes visible keyboard focus. The viewport enables `viewport-fit=cover`. Existing native modal dialogs remain above navigation in the browser top layer. No API, backend, calculation, domain data, or inference behavior changes.

## Verification

- `npm --prefix frontend run build`: passed.
- `npm --prefix frontend run lint`: passed without warnings.
- `php artisan test --compact`: 72 passed, 2,729 assertions.
- `node scripts/review-analysis-navigation.mjs`: passed; covers results deep links, dialogs, scroll restoration, progress/retry/empty states, dataset switching, and mobile navigation without API mutations.
- `node scripts/review-responsive.mjs`: passed 63 page/viewport checks at 320, 375, 390, 430, 768, 1024, 1366, 1920, and 2560px, with no findings, page errors, or API mutations. Includes all workspace pages, login, results tabs, dialogs, dropdown keyboard control, navigation order, active states, dataset continuity, scroll stability, and last-content clearance. Screenshots and audit: `storage/framework/testing/responsive/`.
- `node scripts/review-header-loading.mjs`: passed all 90 page/scenario combinations, sampling header and bottom navigation geometry during initial loading, refresh, and route navigation at 320, 375, 390, 430, and 768px. No page errors or API mutations. Screenshots: `storage/framework/testing/ui-ux/header-*.png`.

Browser checks use Playwright with installed Chrome and synthetic API responses; all API mutations are blocked. These viewport checks do not replace testing Safari/browser chrome and safe areas on physical iPhone/Android devices.
