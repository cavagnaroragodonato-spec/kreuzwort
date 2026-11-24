"""Generate crossword puzzles from a parsed word list.
usage: python3 gen.py words.json out.json SEED
"""
import json, random, sys

N = 13          # max grid size
TARGET = 15     # words per puzzle
ATTEMPTS = 260


def try_build(cands, rng):
    grid = {}
    placed = []

    def can(word, r, c, d):
        dr, dc = (0, 1) if d == 'A' else (1, 0)
        L = len(word)
        er, ec = r + dr * (L - 1), c + dc * (L - 1)
        if r < 0 or c < 0 or er >= N or ec >= N:
            return -1
        if grid.get((r - dr, c - dc)) or grid.get((er + dr, ec + dc)):
            return -1
        cross = 0
        for i, ch in enumerate(word):
            rr, cc = r + dr * i, c + dc * i
            g = grid.get((rr, cc))
            if g:
                if g[0] != ch or d in g[1]:
                    return -1
                cross += 1
            else:
                # perpendicular neighbours must be empty
                if grid.get((rr + dc, cc + dr)) or grid.get((rr - dc, cc - dr)):
                    return -1
        return cross

    def place(w, r, c, d):
        dr, dc = (0, 1) if d == 'A' else (1, 0)
        for i, ch in enumerate(w['a']):
            k = (r + dr * i, c + dc * i)
            if k in grid:
                grid[k] = (ch, grid[k][1] + d)
            else:
                grid[k] = (ch, d)
        placed.append((w, r, c, d))

    first = cands[0]
    d0 = rng.choice('AD')
    L = len(first['a'])
    if d0 == 'A':
        place(first, N // 2, (N - L) // 2, 'A')
    else:
        place(first, (N - L) // 2, N // 2, 'D')
    rest = cands[1:]
    progress = True
    while progress and len(placed) < TARGET:
        progress = False
        for w in list(rest):
            if len(placed) >= TARGET:
                break
            word = w['a']
            best = []
            bestc = 0
            for (gr, gc), (ch, dirs) in list(grid.items()):
                for i, wc in enumerate(word):
                    if wc != ch:
                        continue
                    for d in 'AD':
                        if d in dirs:
                            continue
                        r, c = (gr, gc - i) if d == 'A' else (gr - i, gc)
                        x = can(word, r, c, d)
                        if x > bestc:
                            bestc, best = x, [(r, c, d)]
                        elif x == bestc and x > 0:
                            best.append((r, c, d))
            if best:
                r, c, d = rng.choice(best)
                place(w, r, c, d)
                rest.remove(w)
                progress = True
    rows = [k[0] for k in grid]; cols = [k[1] for k in grid]
    h = max(rows) - min(rows) + 1; wdt = max(cols) - min(cols) + 1
    crosses = sum(1 for v in grid.values() if len(v[1]) == 2)
    score = len(placed) * 10 + crosses * 4 - (h * wdt) * 0.08 - abs(h - wdt) * 0.5
    return score, placed, (min(rows), min(cols), h, wdt), crosses


def pick_clue(w, rng):
    good = [c for c in w['c'] if c['de']]
    c = rng.choice(good) if good else rng.choice(w['c'])
    return c


def finalize(placed, box, rng):
    r0, c0, h, wdt = box
    entries = []
    for w, r, c, d in placed:
        cl = pick_clue(w, rng)
        entries.append({'r': r - r0, 'c': c - c0, 'd': d, 'a': w['a'], 'w': w['w'],
                        'art': w.get('art', ''), 'de': cl['de'], 'en': cl['en'], 'full': cl['full']})
    # numbering
    starts = sorted({(e['r'], e['c']) for e in entries})
    num = {s: i + 1 for i, s in enumerate(starts)}
    for e in entries:
        e['n'] = num[(e['r'], e['c'])]
    entries.sort(key=lambda e: (e['d'], e['n']))
    return {'h': h, 'w': wdt, 'e': entries}


def main():
    words = json.load(open(sys.argv[1], encoding='utf-8'))
    seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    rng = random.Random(seed)
    words = [w for w in words if 3 <= len(w['a']) <= 11]
    unused = words[:]
    rng.shuffle(unused)
    used = []
    puzzles = []
    while len(unused) >= 6:
        best = None
        for _ in range(ATTEMPTS):
            pool = rng.sample(unused, min(len(unused), 45))
            # long word first helps structure
            pool.sort(key=lambda w: -len(w['a']) + rng.random() * 4)
            if len(unused) < 30:
                pool += rng.sample(used, min(len(used), 40))
            res = try_build(pool, rng)
            if best is None or res[0] > best[0]:
                best = res
        score, placed, box, crosses = best
        if len(placed) < 8:
            break
        ids = {w['a'] for w, *_ in placed}
        unused = [w for w in unused if w['a'] not in ids]
        used += [w for w, *_ in placed]
        p = finalize(placed, box, rng)
        puzzles.append(p)
        print(f"#{len(puzzles):02d} words={len(placed)} cross={crosses} {box[2]}x{box[3]} left={len(unused)}", file=sys.stderr)
    json.dump(puzzles, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main()
