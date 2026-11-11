"""Package reviewed source and existing application exports; never calls AI or DB."""
from pathlib import Path
import hashlib
import json
import math
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'submission'
OUT.mkdir(exist_ok=True)
export = ROOT / 'storage/app/private/exports/run-1'
report = json.loads((export / 'results.json').read_text(encoding='utf-8'))
rows = report['activities']
assert report['run_id'] == 1 and len(rows) == 60
assert len({r['activity_id'] for r in rows}) == 60
required = {'activity_id', 'automation_level', 'reason', 'recommendation', 'group_id', 'fte', 'estimated_fte_saving', 'status'}
for row in rows:
    assert required <= row.keys() and row['status'] == 'success'
    assert row['automation_level'] in {'high', 'medium', 'low'}
    calc = report['calculation']
    fte = row['volume'] * row['duration_minutes'] * calc['annual_factors'][row['frequency']] / calc['annual_capacity_minutes']
    assert math.isclose(fte, row['fte'], abs_tol=5.01e-7)
    assert math.isclose(fte * calc['saving_rates'][row['automation_level']], row['estimated_fte_saving'], abs_tol=5.01e-7)
assert math.isclose(next(r['fte'] for r in rows if r['activity_id'] == 'ACT-0001'), .1875, abs_tol=1e-12)
assert math.isclose(report['totals']['total_fte'], 4.4671875, abs_tol=5.01e-7)
members = [m for group in report['groups'] for m in group['members']]
assert sorted(members) == sorted(r['activity_id'] for r in rows)
for field in ['fte', 'estimated_fte_saving', 'remaining_fte']:
    total = 'total_fte' if field == 'fte' else field
    assert math.isclose(sum(r[field] for r in rows), report['totals'][total], abs_tol=60 * 5.01e-7)

# Validate actual workbook fields against the same application JSON export.
from openpyxl import load_workbook
book = load_workbook(export / 'FTEMation.xlsx', data_only=False)
values = list(book['Activities'].values)
xrows = [dict(zip(values[0], r)) for r in values[1:]]
assert len(xrows) == 60
for actual, expected in zip(xrows, rows):
    for key in ['activity_id', 'automation_level', 'group_id', 'fte', 'estimated_fte_saving', 'reason', 'recommendation', 'status']:
        assert actual[key] == expected[key]
assert not any(c.data_type == 'f' for sheet in book for cells in sheet for c in cells)
from pypdf import PdfReader
pdf = PdfReader(export / 'FTEMation.pdf')
pdftext = '\n'.join(p.extract_text() for p in pdf.pages)
assert set(re.findall(r'ACT-\d{4}', pdftext)) == {r['activity_id'] for r in rows}

copies = {
    ROOT / 'samples/FTEMation_Workload_Dataset_v1.xlsx': 'FTEMation_Workload_Dataset_v1.xlsx',
    ROOT / 'docs/ERD_v1.png': 'FTEMation_ERD.png',
    export / 'results.json': 'results.json',
    export / 'FTEMation.xlsx': 'FTEMation.xlsx',
    export / 'FTEMation.pdf': 'FTEMation.pdf',
}
for name in ['METHODOLOGY', 'AI_VERIFICATION', 'SUBMISSION_CHECKLIST', 'DEMO_STORYBOARD', 'FINAL_DELIVERY_REPORT']:
    copies[ROOT / f'docs/{name}.md'] = f'{name}.md'
for src, name in copies.items():
    shutil.copyfile(src, OUT / name)
assert (OUT / 'FTEMation_ERD.pdf').is_file(), 'Prepare and visually verify ERD PDF first.'
(OUT / 'README.md').write_text('''# Paket pengumpulan FTEMation

Ekstrak FTEMation-source.zip. Panduan lengkap, kredensial demo sintetis dan konfigurasi ada di README.md pada root source yang diekstrak. Paket ini tidak memuat env aktual atau database pengguna.

Prasyarat: PHP 8.4, Composer, Node/npm, MySQL/MariaDB dan ekstensi PHP pada README source. Buat database kosong khusus aplikasi, lalu jalankan dari root source:

```powershell
composer install
Copy-Item .env.example .env
# Edit env: database, akun demo, dan key DeepSeek hanya bila akan inference.
php artisan key:generate
php artisan ftemation:check-database
php artisan migrate
php artisan db:seed
npm --prefix frontend ci
npm --prefix frontend run build
composer dev
# Terminal lain bila akan memproses analisis terotorisasi:
php artisan queue:work database --queue=analysis --timeout=360 --tries=40
```

Gunakan satu hostname http://localhost:8000. Jangan reset database yang berisi data. Akun/password demo diset melalui DEMO_USERNAME/DEMO_PASSWORD pada env sebelum seeding; ganti password demo bila dipublikasikan. Jangan mengirim data perusahaan ke provider tanpa izin.

Completed run #1 tidak dimasukkan ke database instalasi baru. Tinjau hasil nyata pada results.json, FTEMation.xlsx dan FTEMation.pdf yang disertakan. Import workbook melalui aplikasi untuk dataset baru; inference baru memerlukan key dan biaya provider. Export yang disertakan berasal dari aplikasi, bukan data palsu.

Baca METHODOLOGY.md, AI_VERIFICATION.md, FINAL_DELIVERY_REPORT.md dan SUBMISSION_CHECKLIST.md untuk metodologi, batas kualitas dan bukti pengujian. DEMO_STORYBOARD.md adalah naskah 9:30; video belum direkam. Upload Drive dan pengaturan sharing belum dilakukan. MANIFEST.json menyediakan SHA-256 artefak.
''', encoding='utf-8')

# Use Git's source inventory plus explicit directory allowlist, never recursive workspace zip.
inventory = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
rootfiles = {'.editorconfig', '.env.example', '.gitattributes', '.gitignore', 'AGENTS.md', 'artisan', 'composer.json', 'composer.lock', 'package.json', 'phpunit.xml', 'README.md'}
dirs = {'app', 'bootstrap', 'config', 'database', 'docs', 'frontend', 'public', 'references', 'resources', 'routes', 'samples', 'scripts', 'tests'}
def allowed(name):
    p = Path(name)
    if not name or not (ROOT / p).is_file():
        return False
    if any(x in p.parts for x in ['node_modules', 'vendor', '.git', 'submission', 'tmp', '.runtime']):
        return False
    if p.name.startswith('.env') and name != '.env.example':
        return False
    if p.suffix.lower() in {'.log', '.sqlite', '.sql', '.zip', '.tsbuildinfo'}:
        return False
    if name.startswith(('public/build/', 'bootstrap/cache/')):
        return p.name == '.gitignore'
    return name in rootfiles or p.parts[0] in dirs or (p.parts[0] == 'storage' and p.name == '.gitignore')
selected = sorted({n for n in inventory if allowed(n)})
archive = OUT / 'FTEMation-source.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in selected:
        z.write(ROOT / name, name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    names = set(z.namelist())
    must = {'.env.example', 'artisan', 'composer.lock', 'frontend/package-lock.json', 'resources/prompts/activity-v1.txt', 'tests/Feature/AnalysisTest.php', 'README.md', 'bootstrap/cache/.gitignore', 'storage/framework/sessions/.gitignore'}
    assert must <= names
    assert '.env' not in names
    assert all(allowed(n) for n in names)
    assert all(not n.startswith(('vendor/', 'frontend/node_modules/', 'storage/app/private/imports/', 'storage/logs/laravel')) for n in names)
    # Never print secrets. Scan exact configured key/password values, no env file copied.
    settings = dict(line.split('=', 1) for line in (ROOT / '.env').read_text(encoding='utf-8').splitlines() if '=' in line and not line.startswith('#'))
    secrets = [v.strip().strip('"\'').encode() for k, v in settings.items() if any(s in k for s in ['API_KEY', 'APP_KEY', 'DB_PASSWORD']) and len(v.strip().strip('"\'')) > 12]
    assert all(not any(secret in z.read(n) for secret in secrets) for n in names)
files = [{'name': p.name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.iterdir()) if p.is_file() and p.name != 'MANIFEST.json']
manifest = {'source_files': len(selected), 'zip_crc': 'PASS', 'zip_required_files': 'PASS', 'zip_exclusions_and_secret_scan': 'PASS', 'json_activities': 60, 'group_members_unique': 60, 'xlsx_json_fields_equal': True, 'xlsx_formula_cells': 0, 'pdf_pages': len(pdf.pages), 'files': files}
(OUT / 'MANIFEST.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps({'zip_files': len(selected), 'artifacts': len(files), 'zip_bytes': archive.stat().st_size, 'validation': 'PASS'}))
