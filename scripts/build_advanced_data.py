"""從人工核對 Markdown 產生進階篇章 Firestore 匯入 JSON。

資料優先順序：人工覆寫 > 既有 Firebase > ECDICT。
若任何單字缺少中文或詞性，腳本會輸出缺漏報告並以失敗結束。
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path


HEADING_RE = re.compile(r"^#{2,3}\s+Unit\s+(\d+)(?:\s*$|｜|（續頁）)")
WORD_RE = re.compile(r"^\d+(?:\.\s+|\s+)(.+)$")
POS_PREFIX_RE = re.compile(
    r"^(?P<pos>(?:n|v|vt|vi|a|adj|ad|adv|prep|conj|pron|num|aux|art|int|interj|det|pl|na)\.)\s*",
    re.IGNORECASE,
)

POS_MAP = {
    "n": "n.",
    "v": "v.",
    "vt": "v.",
    "vi": "v.",
    "a": "adj.",
    "adj": "adj.",
    "s": "adj.",
    "ad": "adv.",
    "adv": "adv.",
    "r": "adv.",
    "prep": "prep.",
    "p": "prep.",
    "conj": "conj.",
    "c": "conj.",
    "pron": "pron.",
    "num": "num.",
    "m": "num.",
    "aux": "aux.",
    "art": "art.",
    "int": "int.",
    "interj": "int.",
    "det": "det.",
    "pl": "n.",
    "na": "n.",
}


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def parse_units(path: Path) -> dict[int, list[str]]:
    units: dict[int, list[str]] = {}
    current: int | None = None

    for line in path.read_text(encoding="utf-8").splitlines():
        heading = HEADING_RE.match(line)
        if heading and not line.startswith("## Unit 120 起"):
            current = int(heading.group(1))
            units.setdefault(current, [])
            continue

        word = WORD_RE.match(line)
        if current is not None and word:
            units[current].append(word.group(1).strip())

    expected = list(range(1, 134))
    if sorted(units) != expected:
        missing = sorted(set(expected) - set(units))
        raise ValueError(f"Unit 必須完整涵蓋 1–133；缺少：{missing}")
    if any(not words for words in units.values()):
        empty = [lesson for lesson, words in units.items() if not words]
        raise ValueError(f"以下 Unit 沒有單字：{empty}")

    for lesson, words in units.items():
        seen: set[str] = set()
        unique_words: list[str] = []
        for word in words:
            key = normalize(word)
            if key in seen:
                print(f"Unit {lesson}：略過同課重複單字 {word}")
                continue
            seen.add(key)
            unique_words.append(word)
        units[lesson] = unique_words
    return units


def load_overrides(path: Path) -> dict[str, dict[str, str]]:
    lookup: dict[str, dict[str, str]] = {}
    if not path.exists():
        return lookup
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        for word, item in raw.items():
            lesson_prefix = ""
            term = word
            if ":" in word and word.split(":", 1)[0].isdigit():
                lesson_prefix, term = word.split(":", 1)
                lesson_prefix += ":"
            lookup[f"{lesson_prefix}{normalize(term)}"] = {
                "chinese": str(item.get("chinese", "")).strip(),
                "pos": str(item.get("pos", item.get("part", ""))).strip(),
            }
        return lookup

    for lesson in raw:
        for item in lesson.get("words", []):
            lesson_number = int(lesson.get("lesson", 0))
            lookup[f"{lesson_number}:{normalize(item.get('word', ''))}"] = {
                "chinese": str(item.get("chinese", "")).strip(),
                "pos": str(item.get("pos", item.get("part", ""))).strip(),
            }
    return lookup


def dictionary_candidates(term: str) -> list[str]:
    value = normalize(term)
    candidates = [value]
    simplified = normalize(value.replace("...", " ").replace("…", " "))
    if simplified not in candidates:
        candidates.append(simplified)

    if " or " in value and value in {"either or", "neither nor"}:
        candidates.append(value.replace(" or", "...or"))

    slash_parts = [normalize(part) for part in re.split(r"\s*/\s*", value) if part.strip()]
    for part in slash_parts:
        if part not in candidates:
            candidates.append(part)

    spaced = normalize(value.replace("-", " "))
    if spaced not in candidates:
        candidates.append(spaced)
    return candidates


def extract_dictionary_fields(row: dict[str, str], converter) -> dict[str, str]:
    meanings: list[str] = []
    positions: list[str] = []

    translation = str(row.get("translation", "") or "").replace("\\n", "\n")
    for raw_line in translation.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("["):
            continue
        match = POS_PREFIX_RE.match(line)
        if match:
            code = match.group("pos").rstrip(".").lower()
            mapped = POS_MAP.get(code)
            if mapped and mapped not in positions:
                positions.append(mapped)
            line = line[match.end():].strip()
        if not line:
            continue
        meaning = re.split(r"[,，;；]", line, maxsplit=1)[0].strip()
        if meaning and meaning not in meanings:
            meanings.append(meaning)
        if len(meanings) >= 2:
            break

    raw_pos = str(row.get("pos", "") or "")
    for part in raw_pos.split("/"):
        code = part.split(":", 1)[0].strip().lower()
        mapped = POS_MAP.get(code)
        if mapped and mapped not in positions:
            positions.append(mapped)

    definition = str(row.get("definition", "") or "").replace("\\n", "\n")
    for line in definition.splitlines():
        code = line.strip().split(" ", 1)[0].lower()
        mapped = POS_MAP.get(code)
        if mapped and mapped not in positions:
            positions.append(mapped)

    chinese = "；".join(meanings[:2])
    if chinese:
        chinese = converter.convert(chinese)
    return {"chinese": chinese, "pos": "/".join(positions[:3])}


def clean_chinese(value: str) -> str:
    lines = str(value or "").replace("\\n", "\n").splitlines()
    cleaned: list[str] = []
    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("["):
            continue
        line = re.sub(
            r"^(?:n|v|vt|vi|a|adj|ad|adv|prep|conj|pron|num|aux|art|int|interj|det|pl|na|abbr)\.\s*",
            "",
            line,
            flags=re.IGNORECASE,
        ).strip()
        if line:
            cleaned.append(line.replace("...", "……"))
        if len(cleaned) >= 2:
            break
    return "；".join(dict.fromkeys(cleaned))


def clean_pos(value: str) -> str:
    replacements = {
        "名詞": "n.",
        "動詞": "v.",
        "形容詞": "adj.",
        "副詞": "adv.",
        "介系詞": "prep.",
        "連接詞": "conj.",
        "代名詞": "pron.",
        "數詞": "num.",
        "冠詞": "art.",
        "感嘆詞": "int.",
        "助動詞": "aux.",
        "限定詞": "det.",
    }
    parts: list[str] = []
    for raw_part in str(value or "").split("/"):
        part = replacements.get(raw_part.strip(), raw_part.strip())
        if part and part not in parts:
            parts.append(part)
    return "/".join(parts)


def load_dictionary(path: Path, targets: set[str], converter) -> dict[str, dict[str, str]]:
    lookup: dict[str, dict[str, str]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            key = normalize(row.get("word", ""))
            if key not in targets or key in lookup:
                continue
            lookup[key] = extract_dictionary_fields(row, converter)
    return lookup


def pick_dictionary(term: str, dictionary: dict[str, dict[str, str]]) -> dict[str, str]:
    found = {"chinese": "", "pos": ""}
    for candidate in dictionary_candidates(term):
        item = dictionary.get(candidate, {})
        if not found["chinese"] and item.get("chinese"):
            found["chinese"] = item["chinese"]
        if not found["pos"] and item.get("pos"):
            found["pos"] = item["pos"]
    return found


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--firebase-lookup", type=Path, required=True)
    parser.add_argument("--dictionary", type=Path, required=True)
    parser.add_argument("--overrides", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--missing-output", type=Path, required=True)
    parser.add_argument("--opencc-path", type=Path, required=True)
    args = parser.parse_args()

    sys.path.insert(0, str(args.opencc_path))
    from opencc import OpenCC  # type: ignore

    converter = OpenCC("s2twp")
    units = parse_units(args.source)
    firebase = json.loads(args.firebase_lookup.read_text(encoding="utf-8"))
    overrides: dict[str, dict[str, str]] = {}
    for override_path in args.overrides:
        overrides.update(load_overrides(override_path))

    targets = {
        candidate
        for words in units.values()
        for word in words
        for candidate in dictionary_candidates(word)
    }
    dictionary = load_dictionary(args.dictionary, targets, converter)

    output: list[dict] = []
    missing: list[dict] = []
    source_counts = {"override": 0, "firebase": 0, "dictionary": 0, "mixed": 0}

    for lesson, words in units.items():
        lesson_words = []
        for word in words:
            key = normalize(word)
            manual = overrides.get(f"{lesson}:{key}", overrides.get(key, {}))
            existing = firebase.get(key, {})
            public = pick_dictionary(word, dictionary)

            chinese = manual.get("chinese") or existing.get("chinese") or public.get("chinese") or ""
            pos = manual.get("pos") or existing.get("pos") or public.get("pos") or ""

            sources = set()
            if manual.get("chinese") or manual.get("pos"):
                sources.add("override")
            if (not manual.get("chinese") and existing.get("chinese")) or (not manual.get("pos") and existing.get("pos")):
                sources.add("firebase")
            if (not (manual.get("chinese") or existing.get("chinese")) and public.get("chinese")) or (
                not (manual.get("pos") or existing.get("pos")) and public.get("pos")
            ):
                sources.add("dictionary")
            source_counts[next(iter(sources)) if len(sources) == 1 else "mixed"] += 1

            item = {"word": word, "chinese": clean_chinese(chinese), "pos": clean_pos(pos)}
            lesson_words.append(item)
            if not item["chinese"] or not item["pos"]:
                missing.append({"lesson": lesson, **item})

        output.append({"lesson": lesson, "words": lesson_words})

    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.missing_output.write_text(json.dumps(missing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = sum(len(item["words"]) for item in output)
    print(f"完成 {len(output)} 課、{total} 筆；來源統計：{source_counts}")
    print(f"缺少中文或詞性：{len(missing)} 筆；報告：{args.missing_output}")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
