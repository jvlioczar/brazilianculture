# Brazilian Culture para IAs e buscadores: o conteúdo é montado por JavaScript (data.js), que muitos robôs não rodam.
#   llms.txt               índice em Markdown (padrão llmstxt.org): o que é o site e o link de cada parada
#   llms-full.txt          todo o conteúdo em inglês, em Markdown
#   pt/llms-full.txt       todo o conteúdo em português
#   JSON-LD por página     <script type="application/ld+json" id="ld-content">: as listas da página como ItemList
#                          (Person, Place, City, DefinedTermSet, Quiz...), com o link da Wikipedia em sameAs
# Lê window.BC rodando data.js no Chrome sem janela. Rode de novo (python tools/llms.py) sempre que data.js mudar:
# ele troca os arquivos e os blocos que ele mesmo gerou.
import re, os, json, glob, html as H, subprocess, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://brazilianculture.biblioverse.org/'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

def load(lang):
    data = os.path.join(ROOT, 'data.js' if lang == 'en' else os.path.join('pt', 'data.js')).replace('\\', '/')
    page = os.path.join(tempfile.gettempdir(), f'ac-dump-{lang}.html')
    open(page, 'w', encoding='utf-8').write(
        f'<!doctype html><meta charset="utf-8"><script src="file:///{data}"></script><pre id="o"></pre>'
        '<script>document.getElementById("o").textContent=JSON.stringify(window.BC)</script>')
    out = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--dump-dom',
                          'file:///' + page.replace('\\', '/')], capture_output=True, encoding='utf-8').stdout
    return json.loads(H.unescape(re.search(r'<pre id="o">(.*?)</pre>', out, re.S).group(1)))

# listas que não vêm de data-list: (chave, posição do h2.sub na página; None = título da página)
EXTRA = {'famosos': [('instagram', 2)], 'comida': [('staples', 0)], 'cidades': [('perfis', 0), ('cidades', None)],
         'politica': [('econ', 1), ('comparaPartidos', 6), ('comparaLideres', 6)], 'marcas': [('gemeas', 0)],
         'curiosidades': [('curiosidades', None)], 'historia': [('historia', None)], 'recordes': [('recordes', None)],
         'quiz': [('quiz', None)]}
PERSON = {'famosos', 'nacionais', 'comediantes', 'politicos', 'magnatas', 'ativistas'}
PLACE = {'lugares'}
L = {'en': {'ig': 'million followers on Instagram', 'pop': 'people', 'ab': 'Nickname', 'fn': 'Another view',
            'q': 'Question', 'a': 'Answer', 'br': 'Closest equivalent abroad', 'src': 'Sources', 'twin': 'abroad', 'au': 'Brazil',
            'by': 'by'},
     'pt': {'ig': 'milhões de seguidores no Instagram', 'pop': 'habitantes', 'ab': 'Apelido', 'fn': 'Outro olhar',
            'q': 'Pergunta', 'a': 'Resposta', 'br': 'Equivalente mais próximo lá fora', 'src': 'Fontes', 'twin': 'lá fora', 'au': 'Brasil',
            'by': 'por'}}

def num(v, lang): return f'{v:,}'.replace(',', '.' if lang == 'pt' else ',')
def wk(it): return 'https://' + it['wk'] if it.get('wk') else None

def item(key, it, lang):
    """(nome, texto em uma linha, url) de cada item, conforme o formato da lista"""
    T = L[lang]
    if key == 'instagram': return it[0], f'{str(it[1]).replace(".", "," if lang == "pt" else ".")} {T["ig"]} ({it[2]})', None
    if key == 'staples': return it[0], it[1], None
    if key == 'cidades': return it[0], f'{it[6]}, {it[2]}: {num(it[1], lang)} {T["pop"]}. {T["ab"]}: {it[5]}', None
    if key == 'gemeas': return f'{it[1]} / {it[2]}', f'{it[0]}: {it[1]} ({T["twin"]}) = {it[2]} ({T["au"]})', None
    if key in ('comparaPartidos', 'comparaLideres'): return it['a'], f'{T["br"]}: {it["b"]} ({it["e"]}). {it["d"]}', None
    if key == 'quiz': return it['q'], f'{T["a"]}: {it["o"][it["a"]]}', None
    bits = [x for x in (it.get('t') if key != 'dicionario' else None, it.get('y'), it.get('s'), it.get('a'), it.get('k'), it.get('o')) if x]
    d = it.get('d', '')
    if it.get('c'): d += f' {T["fn"]}: {it["c"]}'
    return it['n'], (f'({" · ".join(bits)}) ' if bits else '') + d, wk(it) or it.get('u')

def node(key, it, lang):
    name, text, url = item(key, it, lang)
    if key == 'dicionario': n = {'@type': 'DefinedTerm', 'name': name, 'description': it['d']}
    elif key == 'quiz': return {'@type': 'Question', 'name': it['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': it['o'][it['a']]}}
    elif key in PERSON: n = {'@type': 'Person', 'name': name, 'description': it.get('d', text)}
    elif key in PLACE: n = {'@type': 'TouristAttraction', 'name': name, 'description': it.get('d', text)}
    elif key == 'cidades': n = {'@type': 'City', 'name': name, 'description': text,
                                'geo': {'@type': 'GeoCoordinates', 'latitude': it[3], 'longitude': it[4]}}
    elif key == 'sites': n = {'@type': 'WebSite', 'name': name, 'url': it['u'], 'description': it['d']}
    else: n = {'@type': 'Thing', 'name': name, 'description': text}
    if url and key != 'sites': n['sameAs'] = url
    return n

def sections(path, page, A):
    """[(título, [chaves])] na ordem em que aparecem na página"""
    s = open(path, encoding='utf-8').read()
    h1 = re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S).group(1)))).strip()
    h2s, out, cur = [], [], h1
    for m in re.finditer(r'<h2 class="sub">(.*?)</h2>|data-list="(\w+)"', s, re.S):
        if m.group(1) is not None:
            cur = H.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip(); h2s.append(cur)
        elif m.group(2) in A:
            out.append((len(h2s) - 1, cur, m.group(2)))
    for key, i in EXTRA.get(page, []):
        if key in A and (i is None or i < len(h2s)):
            out.append((-1 if i is None else i, h1 if i is None else h2s[i], key))
    out.sort(key=lambda x: x[0])
    groups = []
    for _, title, key in out:
        if groups and groups[-1][0] == title: groups[-1][1].append(key)
        else: groups.append((title, [key]))
    return h1, groups

def meta(s, prop):
    m = re.search(r'<meta content="([^"]*)" name="' + prop + '"/>', s)
    return H.unescape(m.group(1)) if m else ''

# ordem das paradas no site (lista CH_ALL do script.js)
JS = open(os.path.join(ROOT, 'script.js'), encoding='utf-8').read()
ORDER = re.findall(r"""\[\s*["'](\w+)["']\s*,\s*["'][\w-]+\.html["']""", JS[JS.index('const CH_ALL'):JS.index('const CH =')])
pid = lambda p: re.search(r'<body data-page="(\w+)"', open(p, encoding='utf-8').read()).group(1)
rank = lambda p: ORDER.index(p) if p in ORDER else (-1 if p == 'inicio' else 99)

for lang in ('en', 'pt'):
    A = load(lang)
    T = L[lang]
    pages = sorted(glob.glob(os.path.join(ROOT, '*.html') if lang == 'en' else os.path.join(ROOT, 'pt', '*.html')))
    pages = [p for p in pages if not p.endswith('404.html') and 'data-stub' not in open(p, encoding='utf-8').read()]
    pages.sort(key=lambda p: rank(pid(p)))
    md, index = [], []
    for p in pages:
        s = open(p, encoding='utf-8').read()
        page = re.search(r'<body data-page="(\w+)"', s).group(1)
        canon = re.search(r'<link href="([^"]+)" rel="canonical"/>', s).group(1)
        h1, groups = sections(p, page, A)
        title = H.unescape(re.search(r'<title>(.*?)</title>', s).group(1))
        index.append((page, title.split(' — ')[0], canon, meta(s, 'description')))
        # JSON-LD com o conteúdo da página
        s = re.sub(r'\n<script type="application/ld\+json" id="ld-content">.*?</script>', '', s, flags=re.S)
        if groups:
            parts = []
            for gt, keys in groups:
                its = [(k, x) for k in keys for x in A[k]]
                if keys == ['dicionario']:
                    parts.append({'@type': 'DefinedTermSet', 'name': gt, 'url': canon, 'inLanguage': 'en' if lang == 'en' else 'pt-BR',
                                  'hasDefinedTerm': [node(k, x, lang) for k, x in its]})
                elif keys == ['quiz']:
                    parts.append({'@type': 'Quiz', 'name': gt, 'url': canon, 'inLanguage': 'en' if lang == 'en' else 'pt-BR',
                                  'about': {'@type': 'Country', 'name': 'Brazil'}, 'hasPart': [node(k, x, lang) for k, x in its]})
                else:
                    parts.append({'@type': 'ItemList', 'name': gt, 'url': canon, 'numberOfItems': len(its),
                                  'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'item': node(k, x, lang)}
                                                      for i, (k, x) in enumerate(its)]})
            ld = json.dumps({'@context': 'https://schema.org', '@graph': parts}, ensure_ascii=False, separators=(',', ':'))
            ld = ld.replace('</', '<\\/')
            s = s.replace('</head>', f'<script type="application/ld+json" id="ld-content">{ld}</script>\n</head>', 1)
        open(p, 'w', encoding='utf-8').write(s)
        # Markdown completo
        if groups:
            md.append(f'\n## {h1}\n\n{canon}\n')
            for gt, keys in groups:
                if gt != h1: md.append(f'\n### {gt}\n')
                for k in keys:
                    for x in A[k]:
                        name, text, url = item(k, x, lang)
                        md.append(f'- **{name}**: {text}' + (f' <{url}>' if url else ''))
            src = A.get('fontes', {}).get(page)
            if src: md.append(f'\n{T["src"]}: ' + '; '.join(f'[{a}]({b})' for a, b in src))
    intro = {'en': '# Brazilian Culture: full content\n\nEverything in the guide at ' + BASE + ' as plain Markdown, stop by stop, '
                   'with a link to each page. Content updated ' + A['updated'] + '.\n',
             'pt': '# Cultura Brasileira: conteúdo completo\n\nTodo o guia de ' + BASE + 'pt/ em Markdown simples, parada por parada, '
                   'com o link de cada página. Conteúdo atualizado em ' + A['updated'] + '.\n'}[lang]
    full = os.path.join(ROOT, 'llms-full.txt' if lang == 'en' else os.path.join('pt', 'llms-full.txt'))
    open(full, 'w', encoding='utf-8', newline='\n').write(intro + '\n'.join(md) + '\n')
    if lang == 'en': IDX_EN = index
    else: IDX_PT = index
    print(lang, len(pages), 'pages,', sum(1 for l in md if l.startswith('- ')), 'items in llms-full.txt')

# llms.txt (só na raiz, como pede o padrão)
home_en = next(i for i in IDX_EN if i[0] == 'inicio'); home_pt = next(i for i in IDX_PT if i[0] == 'inicio')
order = lambda idx: [i for i in idx if i[0] not in ('inicio', 'sobre')]
txt = ['# Brazilian Culture', '', f'> {home_en[3]}', '',
       'Brazilian Culture (Cultura Brasileira in Portuguese) is a free, bilingual guide to Brazil, part of BiblioVerse. '
       'English lives at the root and Brazilian Portuguese at /pt/. Every page cites its sources. '
       'The pages build their lists with JavaScript, so the full text is also published as Markdown below.', '',
       '## Full content', '',
       f'- [Full guide in English]({BASE}llms-full.txt): every list on every stop, in Markdown',
       f'- [Guia completo em português]({BASE}pt/llms-full.txt): o mesmo conteúdo em português', '',
       '## Stops', '']
txt += [f'- [{n}]({u}): {d}' for _, n, u, d in order(IDX_EN)]
txt += ['', '## Em português', '', f'- [Cultura Brasileira]({home_pt[2]}): {home_pt[3]}']
txt += [f'- [{n}]({u}): {d}' for _, n, u, d in order(IDX_PT)]
about = [i for i in IDX_EN + IDX_PT if i[0] == 'sobre']
txt += ['', '## Optional', ''] + [f'- [{n}]({u}): {d}' for _, n, u, d in about]
open(os.path.join(ROOT, 'llms.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(txt) + '\n')
print('llms.txt', len(txt), 'lines')
