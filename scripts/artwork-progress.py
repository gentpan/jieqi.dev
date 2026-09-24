"""Record built-in imagegen outputs and explicit visual reviews; never generates images."""
import argparse
import json
import shutil
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
SERIES = ROOT / '.jieqi-artwork/complete-series-20260907'
PROGRESS = ROOT / 'docs/artwork-series-progress.json'
parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['generated', 'approve', 'reject'])
parser.add_argument('style')
parser.add_argument('event_id')
parser.add_argument('detail')
args = parser.parse_args()
data = json.loads(PROGRESS.read_text())
asset = next(a for a in data['assets'] if a['style'] == args.style and a['eventId'] == args.event_id)
now = datetime.now(timezone.utc).isoformat()
if args.action == 'generated':
    job = next(j for j in json.loads((SERIES / 'prompts.json').read_text()) if j['style'] == args.style and j['id'] == args.event_id)
    folder = SERIES / args.style
    folder.mkdir(parents=True, exist_ok=True)
    attempts = asset.setdefault('attempts', [])
    basename = args.event_id + (f'-v{len(attempts)+1}' if attempts else '')
    output = folder / (basename + '.png')
    if output.exists():
        raise RuntimeError(f'Refusing overwrite: {output}')
    shutil.copy2(args.detail, output)
    prompt_file = folder / (basename + '.prompt.txt')
    prompt_file.write_text(job['prompt'] + '\n')
    source_path = output.relative_to(ROOT).as_posix()
    prompt_path = prompt_file.relative_to(ROOT).as_posix()
    attempt = {'generator': 'built-in image_gen', 'generationSource': args.detail, 'source': source_path, 'promptFile': prompt_path, 'prompt': job['prompt'], 'generatedAt': now, 'status': 'generated'}
    attempts.append(attempt)
    asset.update(status='generated', source=source_path, generationSource=args.detail, promptFile=prompt_path, generator='built-in image_gen', qa=None)
    (folder / (basename + '.generation.json')).write_text(json.dumps(attempt, ensure_ascii=False, indent=2) + '\n')
else:
    if not asset.get('source') or not (ROOT / asset['source']).is_file():
        raise RuntimeError('Cannot review absent artwork')
    status = 'approved' if args.action == 'approve' else 'rejected'
    qa = {'status': status, 'method': 'individual visual inspection', 'title': asset['title'], 'notes': args.detail, 'reviewedAt': now}
    asset.update(status=status, qa=qa)
    if asset.get('attempts'):
        asset['attempts'][-1].update(status=status, qa=qa)
data['approved'] = sum(a['status'] == 'approved' for a in data['assets'])
data['remaining'] = data['total'] - data['approved']
data['updatedAt'] = now
tmp = PROGRESS.with_suffix('.tmp')
tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
tmp.replace(PROGRESS)
print(f"{args.style}/{args.event_id}: {asset['status']}; approved {data['approved']}/{data['total']}")
