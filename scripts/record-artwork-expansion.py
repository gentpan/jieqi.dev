"""Save one built-in imagegen result with its exact planned prompt."""

import json
import shutil
import sys
import fcntl
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / ".jieqi-artwork/expansion-20260925/prompts.json"
LOCK = ROOT / ".migration/artwork-expansion.lock"

style, event_id, generated = sys.argv[1:4]
origin = Path(generated).resolve()
if not origin.is_file() or origin.suffix.lower() != ".png":
    raise ValueError("Expected an existing generated PNG")
with LOCK.open("w") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    data = json.loads(PLAN.read_text())
    job = next(a for a in data if a["style"] == style and a["eventId"] == event_id)
    target = ROOT / job["source"]
    if target.exists():
        raise FileExistsError(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(origin, target)
    prompt_file = target.with_suffix(".prompt.txt")
    prompt_file.write_text(job["prompt"] + "\n")
    record = {
        "generator": "built-in image_gen",
        "generationSource": str(origin),
        "source": job["source"],
        "promptFile": prompt_file.relative_to(ROOT).as_posix(),
        "prompt": job["prompt"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "generated",
    }
    target.with_suffix(".generation.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    job["status"] = "generated"
    PLAN.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
print(f"{style}/{event_id}: saved {job['source']}")
