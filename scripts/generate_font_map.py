#!/usr/bin/env python3
"""
Generate a best-effort character map for Yuketang encrypted exam fonts.

This is an offline helper. It compares glyph renderings from an encrypted
font against a reference CJK font and emits nearest-neighbor candidates.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw, ImageFont


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--encrypted-font", required=True, type=Path)
    parser.add_argument(
        "--reference-font",
        action="append",
        required=True,
        type=Path,
        help="Reference CJK font. Repeat this flag to compare against multiple fonts.",
    )
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--compact", action="store_true", help="Write only the final character map and metadata.")
    parser.add_argument("--map-id", default="", help="Stable map id, usually the encrypted font file stem.")
    parser.add_argument("--font-size", default=72, type=int)
    parser.add_argument("--image-size", default=28, type=int)
    parser.add_argument("--top-k", default=8, type=int)
    parser.add_argument("--min-codepoint", default=0x4E00, type=lambda x: int(x, 0))
    parser.add_argument("--max-codepoint", default=0x9FFF, type=lambda x: int(x, 0))
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def get_cmap_chars(font_path: Path, min_cp: int, max_cp: int) -> list[str]:
    font = TTFont(str(font_path))
    cmap = font.getBestCmap() or {}
    return [
        chr(cp)
        for cp in sorted(cmap)
        if min_cp <= cp <= max_cp
    ]


def render_char(font: ImageFont.FreeTypeFont, ch: str, image_size: int) -> np.ndarray | None:
    canvas_size = max(image_size * 4, 120)
    image = Image.new("L", (canvas_size, canvas_size), 255)
    draw = ImageDraw.Draw(image)

    try:
        bbox = draw.textbbox((0, 0), ch, font=font)
    except Exception:
        return None

    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    if width <= 0 or height <= 0:
        return None

    x = (canvas_size - width) // 2 - bbox[0]
    y = (canvas_size - height) // 2 - bbox[1]
    draw.text((x, y), ch, font=font, fill=0)

    inverted = ImageChops.invert(image)
    content_bbox = inverted.getbbox()
    if not content_bbox:
        return None

    image = image.crop(content_bbox).resize((image_size, image_size))
    binary = image.point(lambda p: 0 if p < 180 else 255)
    return (1 - (np.asarray(binary, dtype=np.float32).reshape(-1) / 255.0))


def build_reference_matrix(
    reference_font: Path,
    chars: list[str],
    font_size: int,
    image_size: int,
) -> tuple[list[str], np.ndarray, np.ndarray]:
    font = ImageFont.truetype(str(reference_font), font_size)
    kept_chars: list[str] = []
    vectors: list[np.ndarray] = []

    for ch in chars:
        vector = render_char(font, ch, image_size)
        if vector is not None and vector.sum() > 0:
            kept_chars.append(ch)
            vectors.append(vector)

    matrix = np.vstack(vectors).astype(np.float32)
    norms = np.sum(matrix * matrix, axis=1)
    return kept_chars, matrix, norms


def nearest_candidates(
    query: np.ndarray,
    ref_chars: list[str],
    ref_matrix: np.ndarray,
    ref_norms: np.ndarray,
    top_k: int,
) -> list[dict[str, float | str]]:
    query_norm = float(np.sum(query * query))
    distances = ref_norms + query_norm - (2.0 * (ref_matrix @ query))
    top_indices = np.argpartition(distances, min(top_k, len(distances) - 1))[:top_k]
    top_indices = top_indices[np.argsort(distances[top_indices])]

    return [
        {
            "char": ref_chars[int(index)],
            "distance": float(distances[int(index)]),
        }
        for index in top_indices
    ]


def confidence_from_candidates(candidates: list[dict[str, float | str]]) -> float:
    if not candidates:
        return 0.0
    if len(candidates) == 1:
        return 1.0

    first = float(candidates[0]["distance"])
    second = float(candidates[1]["distance"])
    if first <= 0:
        return 1.0

    margin = max(second - first, 0.0)
    return round(min(margin / max(first, 1.0), 1.0), 4)


def main() -> None:
    args = parse_args()

    encrypted_chars = get_cmap_chars(args.encrypted_font, args.min_codepoint, args.max_codepoint)
    reference_sets = []

    for reference_font in args.reference_font:
        reference_chars = get_cmap_chars(reference_font, args.min_codepoint, args.max_codepoint)
        ref_chars, ref_matrix, ref_norms = build_reference_matrix(
            reference_font,
            reference_chars,
            args.font_size,
            args.image_size,
        )
        reference_sets.append((reference_font, ref_chars, ref_matrix, ref_norms))

    encrypted_pil_font = ImageFont.truetype(str(args.encrypted_font), args.font_size)
    entries: dict[str, dict[str, object]] = {}

    for ch in encrypted_chars:
        query = render_char(encrypted_pil_font, ch, args.image_size)
        if query is None or query.sum() <= 0:
            continue

        candidates_by_font = []
        for reference_font, ref_chars, ref_matrix, ref_norms in reference_sets:
            candidates = nearest_candidates(query, ref_chars, ref_matrix, ref_norms, args.top_k)
            for candidate in candidates:
                candidate["reference_font"] = reference_font.name
            candidates_by_font.extend(candidates)

        candidates_by_font.sort(key=lambda item: float(item["distance"]))
        candidates = candidates_by_font[: args.top_k]
        entries[ch] = {
            "best": candidates[0]["char"] if candidates else "",
            "confidence": confidence_from_candidates(candidates),
            "candidates": candidates,
        }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    metadata = {
        "map_id": args.map_id or args.encrypted_font.stem,
        "encrypted_font": str(args.encrypted_font),
        "encrypted_font_sha256": sha256_file(args.encrypted_font),
        "reference_fonts": [str(path) for path in args.reference_font],
        "font_size": args.font_size,
        "image_size": args.image_size,
        "count": len(entries),
    }

    if args.compact:
        payload = {
            **metadata,
            "mappings": {ch: entry["best"] for ch, entry in entries.items() if entry.get("best")},
            "confidence": {ch: entry["confidence"] for ch, entry in entries.items()},
        }
    else:
        payload = {
            **metadata,
            "map": entries,
        }

    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=None if args.compact else 2),
        encoding="utf-8",
    )

    print(f"Wrote {len(entries)} mappings to {args.output}")


if __name__ == "__main__":
    main()
