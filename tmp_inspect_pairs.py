import json, urllib.request
with urllib.request.urlopen('http://localhost:8099/api/v1/pairs?limit=10') as r:
    data = json.load(r)
items = data.get('data') if isinstance(data, dict) and isinstance(data.get('data'), list) else (data if isinstance(data, list) else [])
print(type(items).__name__, len(items))
for item in items[:10]:
    base = item.get('base_token') or {}
    quote = item.get('quote_token') or {}
    print(item.get('id'), base.get('symbol'), '/', quote.get('symbol'))
