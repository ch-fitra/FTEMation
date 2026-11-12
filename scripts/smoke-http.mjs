import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'

// Run against the existing local app. --import adds one real import to ftemation.
// Without --import, this is read-only for workload data (login sessions still change).
const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:8000'
const origin = process.env.SMOKE_ORIGIN ?? base
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Smoke test only supports a local server.')
const env = parseEnv(await readFile(new URL('../.env', import.meta.url), 'utf8'))
const value = key => process.env[key] ?? env[key]
const credentials = { username: value('SMOKE_USERNAME') || value('DEMO_USERNAME'), password: value('SMOKE_PASSWORD') || value('DEMO_PASSWORD') }
if (!credentials.username || !credentials.password) throw new Error('Set SMOKE_USERNAME and SMOKE_PASSWORD to an authorized existing account in .env.')
const cookies = new Map()
let checks = 0
async function request(path, { method = 'GET', json, body, csrf = true } = {}) {
  const headers = { Accept: !path.startsWith('/api') ? 'text/html' : 'application/json', Origin: origin, Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') }
  if (csrf && cookies.has('XSRF-TOKEN')) headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies.get('XSRF-TOKEN'))
  if (json) headers['Content-Type'] = 'application/json'
  const response = await fetch(new URL(path, base), { method, headers, body: json ? JSON.stringify(json) : body, redirect: 'manual' })
  for (const cookie of response.headers.getSetCookie()) { const [pair] = cookie.split(';'); const index = pair.indexOf('='); cookies.set(pair.slice(0, index), pair.slice(index + 1)) }
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { response, data }
}
function status(result, expected, label) { assert.equal(result.response.status, expected, `${label}: expected ${expected}, got ${result.response.status}`); checks++; console.log(`PASS ${label} (${expected})`) }

status(await request('/api/user'), 401, 'guest is denied')
status(await request('/api/login', { method: 'POST', json: credentials, csrf: false }), 419, 'login requires CSRF')
status(await request('/sanctum/csrf-cookie'), 204, 'CSRF cookie issued')
assert(cookies.has('XSRF-TOKEN')); checks++
status(await request('/api/login', { method: 'POST', json: { ...credentials, password: 'deliberately-wrong' } }), 422, 'invalid credentials rejected')
const login = await request('/api/login', { method: 'POST', json: credentials })
status(login, 200, 'authorized account login via session cookie')
assert(!('password' in login.data.user) && !('token' in login.data)); checks++
status(await request('/api/user'), 200, 'authenticated session recognized')
const history = await request('/api/imports'); status(history, 200, 'private import history')
// This acceptance section checks the reference fixture, even when a larger dataset is newer.
let id = history.data.data.find(i => i.status === 'imported' && i.activities_count === 60 && i.employees_count === 12)?.id
if (process.argv.includes('--import')) {
  const body = new FormData()
  body.append('file', new Blob([await readFile(new URL('../samples/FTEMation_Workload_Dataset_v1.xlsx', import.meta.url))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'FTEMation_Workload_Dataset_v1.xlsx')
  const imported = await request('/api/imports', { method: 'POST', body })
  status(imported, 201, 'reference workbook imported into existing ftemation')
  id = imported.data.import.id
}
if (id) {
  const detail = await request(`/api/imports/${id}`); status(detail, 200, 'dataset detail')
  const summary = detail.data.summary
  assert.equal(summary.activities_count, 60); assert.equal(summary.employees_count, 12); assert.equal(summary.departments_count, 3)
  assert(Math.abs(summary.total_fte - 4.4671875) < 1e-10); checks += 4
  assert(summary.estimated_fte_saving === null || (Number.isFinite(summary.estimated_fte_saving) && summary.estimated_fte_saving >= 0 && summary.estimated_fte_saving <= summary.total_fte)); checks++
  const activity = await request(`/api/imports/${id}/activities?search=ACT-0001`); status(activity, 200, 'activity search')
  assert.equal(activity.data.total, 1); assert.equal(Number(activity.data.data[0].fte), 0.1875); checks += 2
  status(await request('/api/imports', { method: 'POST', csrf: false }), 419, 'import requires CSRF')
  console.log(`ACCEPTANCE import #${id}: 60 activities / 12 employees / 3 departments; ACT-0001=0.1875; total=4.4671875`)
} else console.log('SKIP dataset acceptance: no imported dataset; run with --import to add the reference workbook.')
status(await request('/api/logout', { method: 'POST' }), 200, 'logout invalidates session')
status(await request('/api/user'), 401, 'private endpoint denied after logout')
const spa = await request('/'); status(spa, 200, 'built SPA served')
assert.match(spa.data, /<div id="root"><\/div>/); checks++
// BrowserRouter navigation does not test the server's deep-link handling.
for (const path of ['/imports', '/activities', '/analysis', '/imports?review=refresh']) {
  const direct = await request(path)
  status(direct, 200, `direct navigation/refresh ${path}`)
  assert.match(direct.data, /<div id="root"><\/div>/); checks++
}
const assetPath = spa.data.match(/src="([^"]+\.js)"/)?.[1]
assert(assetPath, 'Built SPA must reference its JavaScript asset')
status(await request(assetPath), 200, 'built JavaScript asset remains accessible')
status(await request('/api/route-that-does-not-exist'), 404, 'unknown API is not handled as SPA')
console.log(`HTTP smoke passed: ${checks} checks; base=${base}; origin=${origin}`)
