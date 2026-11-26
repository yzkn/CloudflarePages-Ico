"""list.json を軽い形に書き直す。

入力は古い形 {"tree": [{"path": ..., "description": ...}, ...]}（BOM・字下げつきでもよい）か、
すでに軽い形にしたもの。出力は次の形（UTF-8・BOM なし・LF・字下げなし・1 件 1 行）:

    {"prefixes": ["https://raw.githubusercontent.com/<所有者>/<リポジトリ>/<ブランチ>/", ...],
     "tree": [[出典の番号, path の残り, 説明], ...]}

出典の前置きは、GitHub（raw.githubusercontent.com）なら所有者・リポジトリ・ブランチまで、
ほかはホストまで。読む側は js/app.js の expandList。

使い方: python src/compact-list.py [入力 (既定 list.json)] [出力 (既定 入力と同じ)]
"""
import json
import sys

GITHUB_RAW = 'https://raw.githubusercontent.com/'


def prefix_of(path):
    parts = path.split('/')
    if path.startswith(GITHUB_RAW):
        return '/'.join(parts[:6]) + '/'
    return '/'.join(parts[:3]) + '/'


def load_items(data):
    if isinstance(data.get('prefixes'), list):
        prefixes = data['prefixes']
        return [{'path': prefixes[i] + rest, 'description': desc} for i, rest, desc in data['tree']]
    return [{'path': x['path'], 'description': x.get('description', '')} for x in data['tree']]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else 'list.json'
    dst = sys.argv[2] if len(sys.argv) > 2 else src
    with open(src, encoding='utf-8-sig') as f:
        items = load_items(json.load(f))

    prefixes = sorted({prefix_of(x['path']) for x in items})
    index = {p: i for i, p in enumerate(prefixes)}

    dump = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    lines = [dump([index[prefix_of(x['path'])], x['path'][len(prefix_of(x['path'])):], x['description']]) for x in items]
    out = '{"prefixes":' + dump(prefixes) + ',\n"tree":[\n' + ',\n'.join(lines) + '\n]}\n'

    with open(dst, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)
    print(f'{len(items)} 件、出典 {len(prefixes)} 種 → {dst}')


if __name__ == '__main__':
    main()
