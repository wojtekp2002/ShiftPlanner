# Audyt podatności ShiftPlanner

Stan skanu obrazu i audytu lockfile zweryfikowano 10 listopada 2026 r. Wyniki dotyczą różnych zakresów. Skan ECR obejmuje pakiety systemu operacyjnego w opublikowanym obrazie. Audyt npm obejmuje drzewo zależności zapisane w `web/package-lock.json`. Obraz uruchomieniowy kopiuje wynik Next.js `standalone` i zasoby statyczne. Obecność pakietu w lockfile nie przesądza o jego obecności w obrazie. [Amazon ECR Basic Scanning](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-basic.html) · [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit/) · [Next.js Output File Tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)

## Opublikowany obraz ECR

Ostatni obraz aplikacji w `shiftplanner` w regionie `eu-central-1` nosił tag `c2b2d1813c82f402c04ae13558eaba0540f32d9c` i miał digest `sha256:865c1f76fd85a75b4e8c1e875e1ab6ca5ae7d8d086c152483000cddabd10c2b8`. Skan `COMPLETE` zakończył się o 19:08:15 czasu polskiego. Odczytano ostatni istniejący wynik skanu dla digestu.

| Critical | High | Medium | Low | Razem |
|---:|---:|---:|---:|---:|
| 0 | 6 | 2 | 3 | 11 |

| Pakiet źródłowy Debiana i wersja w skanie | CVE | Severity ECR | Stan poprawki według Debiana |
|---|---|---|---|
| `gcc-12` `12.2.0-14+deb12u1` | CVE-2026-115456 | Low | Bookworm podatny. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-115456) |
| `glibc` `2.36-9+deb12u14` | CVE-2026-86805 | Medium | Bookworm podatny. Poprawkę odnotowano w `2.43-7` w Forky i Sid. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-86805) |
| `glibc` `2.36-9+deb12u14` | CVE-2026-97399 | Low | Bookworm podatny. Problem dotyczy ścieżki zoptymalizowanej dla Power8. Poprawkę odnotowano w `2.43-7` w Forky i Sid. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-97399) |
| `glibc` `2.36-9+deb12u14` | CVE-2026-84243 | High | Bookworm podatny. Wymagane są m.in. kontrola ustawień lokalizacji i dostęp do spreparowanego pliku katalogu wiadomości. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-84243) |
| `glibc` `2.36-9+deb12u14` | CVE-2026-95818 | Low | Bookworm podatny. Poprawkę odnotowano w `2.43-7` w Forky i Sid. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-95818) |
| `util-linux` `2.38.1-5+deb12u3` | CVE-2026-53613 | High | Bookworm podatny. Poprawkę odnotowano w Trixie `2.41.5-0+deb13u1`. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-53613) |
| `util-linux` `2.38.1-5+deb12u3` | CVE-2026-53615 | High | Bookworm podatny. Poprawkę odnotowano w Trixie `2.41.5-0+deb13u1`. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-53615) |
| `util-linux` `2.38.1-5+deb12u3` | CVE-2026-78410 | High | Bookworm podatny. Poprawkę odnotowano w `2.42.4-1` w Forky i Sid. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-78410) |
| `util-linux` `2.38.1-5+deb12u3` | CVE-2026-13595 | Medium | Bookworm podatny. Poprawkę odnotowano w Trixie `2.41.5-0+deb13u1`. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-13595) |
| `zlib` `1.2.13.dfsg-1` | CVE-2026-85091 | High | ECR i Debian oznaczają Bookworm jako podatny, choć opis zakresu upstream zaczyna się od `1.3.1.2`. Trixie ma poprawkę `1:1.3.dfsg+really1.3.1-1+deb13u1`. Wymagana jest weryfikacja zakresu dla Bookworm przed zmianą klasyfikacji. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-85091) |
| `zlib` `1.2.13.dfsg-1` | CVE-2026-76844 | High | Bookworm podatny. Trixie ma poprawkę `1:1.3.dfsg+really1.3.1-1+deb13u1`. [Status Debiana](https://security-tracker.debian.org/tracker/CVE-2026-76844) |

Wszystkie wpisy w tabeli pochodzą ze skanu warstw obrazu uruchomieniowego. Nazwy źródłowe Debiana mogą odnosić się do zainstalowanych bibliotek, np. `libstdc++` pochodzącej z pakietu źródłowego `gcc-12`. Nie potwierdzono małej aktualizacji w Bookworm, która usunęłaby te zgłoszenia. Zmiana wydania Debiana wymaga osobnej próby budowania i testu działania obrazu. Dostęp do systemu plików, użycie narzędzi systemowych i inne warunki wykorzystania należy oceniać dla każdego CVE odrębnie.

## Lockfile npm

Audyt wykonano z katalogu `web` za pomocą npm `10.9.3` i Node.js `22.19.0`. Poniższa tabela przedstawia liczbę pakietów oznaczonych przez npm według najwyższego przypisanego poziomu.

| Polecenie dla pierwotnego lockfile | Critical | High | Moderate | Low | Razem |
|---|---:|---:|---:|---:|---:|
| `npm audit --json` | 2 | 14 | 14 | 2 | 32 |
| `npm audit --omit=dev --json` | 2 | 14 | 7 | 2 | 25 |

| Pakiet i wersja | Severity npm | Zakres i poprawka |
|---|---|---|
| `next` `16.2.6` | Critical | Bezpośrednia zależność serwera. CVE-2026-75604 dotyczy hostów Windows, a poprawka jest w `16.3.3`. Pozostałe zgłoszenia krytyczne dotyczą określonych trybów optymalizacji AVIF i SVG, `ImageResponse` oraz `use cache`. Poprawki dla gałęzi 16 to odpowiednio `16.3.3`, `16.4.1`, `16.3.6` i `16.4.1`. npm wskazuje `16.4.6`. [CVE-2026-75604](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) · [AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) · [SVG](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) · [ImageResponse](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) · [use cache](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) |
| `sharp` `0.34.5` | High | Zależność optymalizacji obrazów obecna w działającym kontenerze. Zgłoszenia obejmują biblioteki libvips, libheif i librsvg, m.in. CVE-2026-96889. Wersja `0.35.5` zawiera wskazane poprawki. [libvips](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) · [libheif](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) · [librsvg](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) |
| `postcss` `8.4.31`, `8.5.14` | High | Narzędzie przetwarzania CSS, obecne w kilku gałęziach drzewa. Przykładowe zgłoszenie CVE-2026-69153 usunięto w `8.5.23`. [Informacja producenta](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp) |
| `proxy-addr` `2.0.7` | Critical | CVE-2026-90711. Zależność Express w drzewie narzędzia `shadcn` i SDK MCP. Poprawka jest w `2.0.8`. Pakiet nie występował w `/app/node_modules` działającego kontenera. [Informacja producenta](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h) |
| `shadcn` `4.7.0` i zależności | High | Narzędzie CLI zapisane w `dependencies`. Lokalne drzewo obejmuje `@modelcontextprotocol/sdk`, `deepmerge`, `ts-morph` i `zod`. Automatyczna propozycja npm dla części zgłoszeń prowadzi do obniżenia `shadcn` do `1.0.0`. Zmiana wymaga osobnej oceny zgodności. [Kod i wydania shadcn](https://github.com/shadcn-ui/ui) |

Pełny audyt obejmuje także pakiety narzędziowe, m.in. `eslint-config-next`, `@typescript-eslint/*`, `typescript-eslint` i `minimatch`. Audyt `--omit=dev` obejmuje drzewo `shadcn`, ponieważ projekt deklaruje CLI w `dependencies`. W działającym kontenerze obrazu o tagu `c2b2d1813c82f402c04ae13558eaba0540f32d9c` potwierdzono `next 16.2.6` i `sharp 0.34.5`. W katalogu `/app/node_modules` nie znaleziono katalogów `shadcn` ani `proxy-addr`.

## Zweryfikowana aktualizacja

W odizolowanej kopii projektu podniesiono razem `next` i `eslint-config-next` z `16.2.6` do `16.4.6`. Lockfile rozwiązuje `sharp` do `0.35.5` i `postcss` do `8.5.23`. Osobno podniesiono `proxy-addr` z `2.0.7` do `2.0.8` w zakresie Express `^2.0.7`. Aplikacja korzysta z `next/image`. Przegląd źródeł nie wykazał użycia `next/og` ani dyrektywy `use cache`. [Wydanie Next.js 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6), [Poprawka proxy-addr](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h)

Kandydat przeszedł `npm ci`, `npm run lint`, `next typegen`, `tsc --noEmit` i `npm run build` z testowymi wartościami publicznych zmiennych Supabase. ESLint zgłosił dwa ostrzeżenia o nieużywanych symbolach. Po tych testach zweryfikowane `package.json` i `package-lock.json` przeniesiono do lokalnego repozytorium. Opublikowany obraz zachowuje wcześniejsze wersje do kolejnego udanego wdrożenia.

| Polecenie dla kandydata | Critical | High | Moderate | Low | Razem |
|---|---:|---:|---:|---:|---:|
| `npm audit --json` | 0 | 11 | 14 | 2 | 27 |
| `npm audit --omit=dev --json` | 0 | 11 | 7 | 2 | 20 |

W audycie zweryfikowanego lockfile ustąpiły wpisy dla Next.js, Sharp, PostCSS i `proxy-addr`. Pozostałe zgłoszenia npm należy oceniać w kontekście drzewa zależności i zawartości obrazu. Tabela ECR opisuje opublikowany obraz, a tabela npm opisuje lokalny lockfile po zmianach.

Po publikacji poprawki należy odczytać nowy wynik ECR dla digestu obrazu z wdrożenia. Weryfikacja npm nie aktualizuje raportu istniejącego obrazu ECR.
