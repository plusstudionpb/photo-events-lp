import sys
import os

sys.path.append(os.path.dirname(__file__))

import json
import datetime
import hashlib
import time
import feedparser

from rules import is_r18
from affiliate import to_affiliate
from geo import extract_pref


def uid(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


def entry_start(entry):
    st = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if st:
        ts = int(time.mktime(st))
        dt = datetime.datetime.fromtimestamp(ts)
        return dt, ts
    return None, None


INCLUDE_KEYWORDS = [
    "撮影会", "個撮", "個人撮影", "モデル撮影", "ポートレート",
    "コスプレ撮影", "コスプレ", "アイドル撮影会", "チェキ会",
    "撮影イベント", "フォトセッション", "被写体募集"
]

EXCLUDE_KEYWORDS = [
    "七五三", "お宮参り", "家族写真", "ベビーフォト", "ニューボーン",
    "前撮り", "成人式前撮り", "入園", "入学", "卒園", "卒業",
    "ウェディング", "ブライダル", "マタニティ", "証明写真"
]


def should_include(title: str, organizer: str, url: str) -> bool:
    text = f"{title} {organizer} {url}".lower()

    for k in EXCLUDE_KEYWORDS:
        if k.lower() in text:
            return False

    for k in INCLUDE_KEYWORDS:
        if k.lower() in text:
            return True

    return False


def main():
    with open("feeds.txt", encoding="utf-8") as f:
        feeds = [x.strip() for x in f if x.strip() and not x.startswith("#")]

    os.makedirs("api", exist_ok=True)
    items = []

    for feed in feeds:
        d = feedparser.parse(feed)
        organizer = d.feed.get("title", "") if hasattr(d, "feed") else ""

        for e in d.entries[:60]:
            title = getattr(e, "title", "") or ""
            link = getattr(e, "link", "") or ""
            if not title or not link:
                continue

            if not should_include(title, organizer, link):
                continue

            dt, ts = entry_start(e)
            pref = extract_pref(title + " " + organizer + " " + link)
            rating = "r18" if is_r18(title, link) else "all"

            items.append({
                "id": uid(link),
                "title": title,
                "date": getattr(e, "published", "") or getattr(e, "updated", "") or "",
                "start_date": dt.strftime("%Y-%m-%d") if dt else "",
                "start_ts": ts or 0,
                "pref": pref,
                "city": "",
                "venue": "",
                "price": "",
                "organizer": organizer,
                "official_url": to_affiliate(link),
                "rating": rating,
                "genres": ["other"],
                "tags": ["RSS"] + (["R18"] if rating == "r18" else ["全年齢"])
            })

    seen = set()
    uniq = []
    for i in items:
        if i["official_url"] in seen:
            continue
        seen.add(i["official_url"])
        uniq.append(i)

    uniq.sort(key=lambda x: x["start_ts"], reverse=True)

    out = {
        "last_updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "items": uniq[:300]
    }

    with open("api/latest.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
