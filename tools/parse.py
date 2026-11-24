import re, json, sys, unicodedata
SEP = ["zurück","zusammen","fern","weg","los","nach","statt","vorbei","weiter","hin","her","heraus","herein","hinein","mit","vor","zu","ab","an","auf","aus","ein","um","bei","fest","kennen","spazieren","teil","frei","dabei","fort","durch","wieder","über","unter"]
def norm(s): return s.lower().replace('ä','a').replace('ö','o').replace('ü','u').replace('ß','ss')
def clean_head(h):
    h = re.sub(r'\(\d+\)','',h).strip()
    h = re.sub(r'^\(sich\)\s*','',h)
    h = h.split(',')[0].strip()
    h = re.sub(r'^(der|die|das)\s+','',h)
    h = re.sub(r'\(.*?\)','',h).strip()
    return h
def answer(w):
    return w.upper().replace('ß','SS')
TOK = re.compile(r"[A-Za-zÄÖÜäöüß]+")
def blank(word, sent):
    toks = [(m.start(), m.end(), m.group()) for m in TOK.finditer(sent)]
    nw = norm(word)
    def rep(spans):
        out=sent
        for a,b in sorted(spans, reverse=True): out = out[:a]+'____'+out[b:]
        return out
    # exact
    hits=[(a,b) for a,b,t in toks if norm(t)==nw]
    if hits: return rep(hits[:1]), 'exact'
    # stem match
    stem = nw
    for suf in ('ieren','eln','ern','en','n','e'):
        if nw.endswith(suf) and len(nw)-len(suf)>=3: stem = nw[:-len(suf)]; break
    if len(stem)>=4 or (len(stem)>=3 and len(nw)<=5):
        hits=[(a,b) for a,b,t in toks if norm(t).startswith(stem) or (len(stem)>=5 and stem[:-1] and norm(t).startswith(stem[:-1]))]
        if hits: return rep(hits[:1]), 'stem'
    # separable verb
    for p in sorted(SEP, key=len, reverse=True):
        pn=norm(p)
        if nw.startswith(pn) and len(nw)-len(pn)>=4:
            core = nw[len(pn):]
            cst = core
            for suf in ('en','n'):
                if core.endswith(suf): cst=core[:-len(suf)]; break
            cst2 = cst[:3] if len(cst)>=3 else cst
            ci=[i for i,(a,b,t) in enumerate(toks) if norm(t).startswith(cst2)]
            pi=[i for i,(a,b,t) in enumerate(toks) if norm(t)==pn]
            if ci and pi:
                j=[k for k in pi if k>ci[0]]
                if j: return rep([toks[ci[0]][:2], toks[j[-1]][:2]]), 'sep'
            break
    return None, None

def load(level, base):
    rows=[l.rstrip('\n').split('\t') for l in open(f'{base}/{level}/{level}.tsv', encoding='utf-8') if l.strip()]
    words={}
    stats={}
    for r in rows:
        if len(r)<3: continue
        h,de,en=r[0],r[1].strip(),r[2].strip()
        m=re.search(r'\b(der|die|das)\s',re.sub(r'^\(sich\)\s*','',re.sub(r'\(\d+\)','',h)).strip()[:4])
        art=m.group(1) if m else ''
        w=clean_head(h)
        if not re.fullmatch(r'[A-Za-zÄÖÜäöüß]+', w): stats['skip']=stats.get('skip',0)+1; continue
        a=answer(w)
        if not (3<=len(a)<=12): stats['len']=stats.get('len',0)+1; continue
        b,kind=blank(w,de)
        stats[kind]=stats.get(kind,0)+1
        e=words.setdefault(a,{'a':a,'w':w,'art':art,'c':[]})
        e['c'].append({'de':b,'en':en,'full':de})
    return list(words.values()), stats
if __name__=='__main__':
    ws,st=load(sys.argv[1], sys.argv[2])
    print(len(ws), st, file=sys.stderr)
    json.dump(ws, open(sys.argv[3],'w',encoding='utf-8'), ensure_ascii=False, indent=0)
