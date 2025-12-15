from urllib.parse import urlparse, urlencode, urlunparse, parse_qs

# ▼▼ ここだけあなたのアフィIDに変更 ▼▼
AFFILIATE_RULES = {
    "fantia.jp": {"type": "query", "key": "ref", "value": "YOUR_FANTIA_ID"},
    "dlsite.com": {"type": "query", "key": "affiliate_id", "value": "YOUR_DLSITE_ID"}
}
# ▲▲ ここまで ▲▲

def to_affiliate(url: str) -> str:
    try:
        p = urlparse(url)
        domain = p.netloc.lower()

        for d, rule in AFFILIATE_RULES.items():
            if d in domain:
                qs = parse_qs(p.query)
                qs[rule["key"]] = [rule["value"]]
                new_query = urlencode(qs, doseq=True)
                return urlunparse(p._replace(query=new_query))
    except:
        pass

    return url
