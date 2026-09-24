"""Write distinct image-generation prompts for the five new complete series."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / ".jieqi-artwork/expansion-20260925"
OLD = ROOT / ".jieqi-artwork/stamp-series-20260906"
source_jobs = json.loads((ROOT / ".jieqi-artwork/complete-series-20260907/prompts.json").read_text())
events = {}
for job in source_jobs:
    if job["style"] != "minimal":
        continue
    scene = re.search(r"Scene and seasonal subjects: (.*)", job["prompt"])
    if not scene:
        raise ValueError(job["id"])
    events[job["id"]] = {"title": job["title"], "scene": scene.group(1)}
events["childrens-day"] = {
    "title": "儿童节",
    "scene": "a joyful wooden rocking horse, a pinwheel and a few floating balloons in a sunny early-summer garden; celebrate children and play",
}
events["term-bailu"] = {
    "title": "白露",
    "scene": "a white egret standing among autumn reeds and long grass with clear dew drops; serene early autumn morning",
}
assert len(events) == 40

styles = {
    "watercolor": {
        "name": "水彩手绘",
        "reference": OLD / "bailu-watercolor.png",
        "description": "Match the reference's warm ivory perforated postage-stamp silhouette, fine terracotta inner border, transparent hand-painted watercolor washes, botanical delicacy and airy negative space. Use season-appropriate soft pigments and place the main scene below the title.",
        "avoid": "opaque cut-paper layers, clay modeling, woodcut hatching, embroidery",
    },
    "papercut": {
        "name": "层叠剪纸",
        "reference": OLD / "bailu-papercut.png",
        "description": "Match the reference's warm ivory perforated postage-stamp silhouette and fine terracotta inner border. Build the seasonal scene from physically layered colored paper with crisp hand-cut edges, visible paper fibers, subtle depth and cast shadows. Place the main scene below the title.",
        "avoid": "watercolor washes, clay modeling, woodcut hatching, embroidery",
    },
    "clay": {
        "name": "软萌粘土",
        "reference": OLD / "bailu-clay.png",
        "description": "Match the reference's warm ivory perforated postage-stamp silhouette and thin terracotta inner border. Sculpt a charming seasonal miniature from soft matte clay with rounded forms, gentle handmade fingerprints, tiny realistic shadows and quiet cream background. Cute but not childish. Place the scene below the title.",
        "avoid": "watercolor washes, cut-paper layers, woodcut hatching, embroidery",
    },
    "woodblock": {
        "name": "木刻版画",
        "reference": BASE / "woodblock/term-lichun.png",
        "description": "Match the reference's Chinese hand-carved multi-block print character: confident chiseled ink contours, subtle registration offsets, textured handmade rice paper, rich indigo, vermilion and warm cream, with seasonal accent color. Strong silhouette, contemporary balanced composition.",
        "avoid": "postage-stamp border or perforation, watercolor washes, paper-cut layers, clay, embroidery",
    },
    "embroidery": {
        "name": "丝线刺绣",
        "reference": BASE / "embroidery/term-lichun.png",
        "description": "Match the reference's delicate Chinese silk embroidery on woven ivory linen: visible directional satin stitches, fine threads, subtle raised texture, luminous silk highlights and calm negative space. Use a restrained seasonal palette and place the motif below the title.",
        "avoid": "postage-stamp border or perforation, watercolor washes, paper-cut layers, clay, 3D toy look",
    },
}

assets = []
for style, spec in styles.items():
    for event_id, event in sorted(events.items()):
        title = event["title"]
        prompt = (
            "Use case: stylized-concept.\n"
            "Asset type: ONE standalone portrait 2:3, 1024x1536 illustrated Chinese seasonal greeting card; one complete image, not a collage.\n"
            f"Image 1 is a STYLE REFERENCE ONLY for the {spec['name']} series. Preserve its medium, border treatment and title placement while creating a new event-specific scene.\n"
            f"Primary request: {title}, the {spec['name']} series.\n"
            f"Scene and seasonal subjects: {event['scene']}.\n"
            f"Style and composition: {spec['description']}\n"
            f'Text (verbatim): "{title}". Exactly these {len(title)} correct simplified Chinese characters only, large and vertically arranged near upper center, fully legible with accurate strokes and generous margins.\n'
            f"Avoid: any other text, English, numbers, dates, poem, signature, logo, watermark, UI screenshot, cropped subject, {spec['avoid']}."
        )
        original = BASE / style / f"{event_id}.png"
        if event_id == "term-bailu" and style in ("watercolor", "papercut", "clay"):
            original = spec["reference"]
        assets.append({
            "style": style,
            "styleName": spec["name"],
            "eventId": event_id,
            "title": title,
            "scene": event["scene"],
            "prompt": prompt,
            "reference": spec["reference"].relative_to(ROOT).as_posix(),
            "source": original.relative_to(ROOT).as_posix(),
            "status": "generated" if original.is_file() else "pending",
        })

BASE.mkdir(parents=True, exist_ok=True)
(BASE / "prompts.json").write_text(json.dumps(assets, ensure_ascii=False, indent=2) + "\n")
print(f"Prepared {len(assets)} prompts; {sum(a['status'] == 'generated' for a in assets)} source images exist")
