# Kreuzwort

Crucigramas para aprender vocabulario alemán, con las listas oficiales del Goethe-Institut
(datos de [ilkermeliksitki/goethe-institute-wordlist](https://github.com/ilkermeliksitki/goethe-institute-wordlist)).

- Mapa de niveles A1 · A2 · B1. Todos los crucigramas están habilitados: se juegan en cualquier orden.
- La pista de cada palabra es la oración de ejemplo con un hueco, más su artículo (der/die/das) si es sustantivo.
  El botón **Traducción** muestra la oración en inglés.
- Estrellas: ★★★ sin revelar letras · ★★ hasta 3 letras reveladas · ★ completado.
- El progreso se guarda en el navegador (localStorage).

Por ahora solo está A1 (41 crucigramas, ~600 palabras).

## Regenerar los crucigramas

```bash
git clone https://github.com/ilkermeliksitki/goethe-institute-wordlist /tmp/wl
python3 tools/parse.py a1 /tmp/wl /tmp/a1_words.json
python3 tools/gen.py /tmp/a1_words.json data/a1.json 7
```

Para sumar A2/B1: generar `data/a2.json` / `data/b1.json` igual y sacar `locked: true` en `LEVELS` (`js/app.js`).
