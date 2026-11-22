# Wzory i obliczenia

Strona pokazuje sposób zapisania wzorów matematycznych w dokumentacji. Działa zarówno zapis w jednej linijce, jak i wieloliniowy blok.

## Wzór w tekście

Dzienna stawka wynosi $stawka = podstawa / 30$, natomiast kwota świadczenia jest obliczana jako $kwota = stawka \cdot dni \cdot stopa / 100$.

## Podstawa wymiaru

Wprowadzone wynagrodzenie brutto pomniejszane jest o 13,71% składek społecznych:

$$
P = B \cdot (1 - 0.1371)
$$

gdzie:

- $P$ — podstawa wymiaru netto,
- $B$ — wynagrodzenie miesięczne brutto.

## Stawka dzienna

$$
S = \frac{P}{30}
$$

## Kwota świadczenia

$$
K = S \cdot D \cdot \frac{r}{100}
$$

gdzie:

- $S$ — stawka dzienna,
- $D$ — liczba dni,
- $r$ — stawka świadczenia,
- $K$ — łączna kwota świadczenia.

## Przykład

Przy wynagrodzeniu brutto $B = 8000$ zł:

$$
P = 8000 \cdot (1 - 0.1371) = 6903.20
$$

$$
S = \frac{6903.20}{30} \approx 230.11
$$

## Zapis w dokumentacji

Wzór w tekście zapisuj między znakami dolara:

```markdown
Dzienna stawka: $stawka = podstawa / 30$
```

Blok wzoru zapisuj między dwoma znakami dolara:

```markdown
$$
S = \frac{P}{30}
$$
```

W edytorze można pisać zwykły LaTeX, na przykład `\frac`, `\cdot` i `\sum`. MkDocs renderuje go przez MathJax.
