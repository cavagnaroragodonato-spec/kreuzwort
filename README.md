# Kreuzwort

Crucigramas para aprender vocabulario alemán, con las listas oficiales del Goethe-Institut
(datos de [ilkermeliksitki/goethe-institute-wordlist](https://github.com/ilkermeliksitki/goethe-institute-wordlist)).

- Mapa de niveles A1 (41) · A2 (38) · B1 (113). Dentro de un nivel se juegan en cualquier orden.
  A2 se desbloquea con el 70% de las estrellas de A1, y B1 con el 70% de las de A2.
- Cada nivel usa solo palabras nuevas (A2 no repite las de A1, B1 no repite las de A1/A2).
- Las palabras correctas quedan fijas en verde y no se pueden borrar.
- La pista de cada palabra es la oración de ejemplo con un hueco, más su artículo (der/die/das) si es sustantivo.
  El botón **Traducción** muestra la oración en inglés (cada partida empieza con la traducción apagada).
- Al terminar marcás las palabras que no sabías; se guardan en 📚 y te tomo un repaso con tarjetas.
- Estrellas: ★★★ sin revelar letras · ★★ hasta 3 letras reveladas · ★ completado.
- El progreso se guarda en el navegador (localStorage).


## Regenerar los crucigramas

```bash
git clone https://github.com/ilkermeliksitki/goethe-institute-wordlist /tmp/wl
python3 tools/parse.py a1 /tmp/wl /tmp/a1_words.json
python3 tools/gen.py /tmp/a1_words.json data/a1.json 7
python3 tools/parse.py a2 /tmp/wl /tmp/a2_words.json /tmp/a1_words.json
python3 tools/gen.py /tmp/a2_words.json data/a2.json 11
python3 tools/parse.py b1 /tmp/wl /tmp/b1_words.json /tmp/a1_words.json /tmp/a2_words.json
python3 tools/gen.py /tmp/b1_words.json data/b1.json 13
```
(Regenerar cambia los crucigramas y el progreso guardado deja de coincidir.)
