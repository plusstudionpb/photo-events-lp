R18_KEYWORDS = [
    "R18", "18禁", "アダルト", "個撮", "個人撮影",
    "ヌード", "セミヌード", "水着撮影", "グラビア",
    "下着", "ランジェリー", "大人向け", "成人向け"
]

R18_DOMAINS = [
    "fantia.jp",
    "dlsite.com",
    "fc2.com",
    "ci-en.net"
]

def is_r18(title: str, url: str) -> bool:
    t = (title or "").lower()
    u = (url or "").lower()

    for k in R18_KEYWORDS:
        if k.lower() in t:
            return True

    for d in R18_DOMAINS:
        if d in u:
            return True

    return False
