# ShiftMate — Specyfikacja MVP v1

## 1. Cel projektu

Celem projektu jest stworzenie aplikacji webowej do planowania grafików pracy dla zespołów. Aplikacja ma umożliwiać managerowi tworzenie zespołu, zapraszanie pracowników przez kod, zbieranie dostępności pracowników oraz generowanie wstępnego grafiku pracy, który manager może następnie edytować i opublikować.

Projekt ma być początkowo tworzony pod realny przypadek użycia, ale architektura i funkcje powinny być wystarczająco uniwersalne, aby aplikację dało się wykorzystać w różnych typach miejsc pracy, np. kawiarni, restauracji, sklepie, salonie usługowym, recepcji, siłowni lub małej firmie.

---

## 2. Stack technologiczny

### Frontend i backend

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui

### Baza danych i backend services

- Supabase
- PostgreSQL
- Drizzle ORM

### Autoryzacja

- Supabase Auth

### Hosting

- Vercel — aplikacja Next.js
- Supabase Free Plan — baza danych i auth

---

## 3. Główna idea aplikacji

Aplikacja działa wokół zespołów pracy.

Użytkownik zakłada konto, a następnie może:

- stworzyć własny zespół jako manager/owner,
- dołączyć do istniejącego zespołu jako pracownik przez kod dołączenia,
- należeć do wielu zespołów jednocześnie,
- mieć różne role w różnych zespołach.

Rola użytkownika nie jest przypisana globalnie do konta, tylko do konkretnego zespołu.

Przykład:

```txt
Kasia ma jedno konto w aplikacji.
W zespole „Kawiarnia Luna” jest pracownikiem.
W zespole „Eventy Weekendowe” jest managerem.
```

---

## 4. Role użytkowników

### 4.1 Owner

Owner to osoba, która utworzyła zespół.

Owner może:

- zarządzać ustawieniami zespołu,
- zmieniać nazwę zespołu,
- generować i resetować kod dołączenia,
- zapraszać pracowników,
- usuwać członków zespołu,
- nadawać role,
- tworzyć wymagania zmian,
- generować grafik,
- edytować grafik,
- publikować grafik,
- widzieć statystyki godzin.

W MVP rola Owner może być technicznie traktowana podobnie jak Manager, ale warto przewidzieć ją w bazie danych.

### 4.2 Manager

Manager to osoba odpowiedzialna za planowanie grafiku.

Manager może:

- widzieć członków zespołu,
- widzieć dostępność pracowników,
- tworzyć wymagane zmiany,
- wygenerować propozycję grafiku,
- ręcznie edytować grafik,
- opublikować grafik,
- widzieć liczbę godzin przypisanych pracownikom.

### 4.3 Employee

Employee to pracownik należący do zespołu.

Employee może:

- dołączyć do zespołu przez kod,
- uzupełniać swoją dostępność,
- edytować swoją dostępność przed opublikowaniem grafiku,
- widzieć swój grafik,
- widzieć liczbę swoich godzin,
- widzieć status grafiku, np. draft/published.

---

## 5. Najważniejsze założenia produktowe

### 5.1 Konto użytkownika

Każdy użytkownik ma jedno konto w aplikacji.

Konto zawiera podstawowe informacje:

- imię i nazwisko,
- email,
- avatar opcjonalnie w przyszłości,
- data utworzenia konta.

Typ konta nie jest wybierany na stałe jako manager/pracownik. Użytkownik może pełnić różne role zależnie od zespołu.

### 5.2 Zespół

Zespół reprezentuje jedną jednostkę organizacyjną, np. kawiarnię, sklep albo salon.

Manager tworzy zespół i otrzymuje kod dołączenia. Pracownicy mogą wpisać ten kod i dołączyć do zespołu.

### 5.3 Kod dołączenia

Kod dołączenia pozwala pracownikowi dołączyć do zespołu bez zaproszenia mailowego.

Przykład:

```txt
LUNA-8K2D
```

W MVP kod może być prostym losowym stringiem zapisanym w tabeli `teams` albo osobnej tabeli `join_codes`.

### 5.4 Dostępność

Pracownik uzupełnia dostępność dla konkretnego tygodnia.

Przykład:

```txt
Poniedziałek: 08:00–16:00
Wtorek: niedostępny
Środa: 12:00–20:00
Czwartek: 08:00–14:00
Piątek: 14:00–22:00
```

W MVP dostępność oznacza przedział czasu, w którym pracownik może pracować.

W przyszłości można dodać typy dostępności:

- available — mogę pracować,
- preferred — preferuję pracować,
- unavailable — nie mogę pracować.

### 5.5 Wymagane zmiany

Manager definiuje, jakie zmiany są potrzebne w danym tygodniu.

Przykład:

```txt
Poniedziałek 08:00–16:00 — potrzebne 2 osoby
Poniedziałek 16:00–22:00 — potrzebne 2 osoby
Wtorek 08:00–16:00 — potrzebna 1 osoba
```

W MVP jedna zmiana ma:

- datę,
- godzinę rozpoczęcia,
- godzinę zakończenia,
- wymaganą liczbę osób.

W przyszłości można dodać stanowiska, np. barista, kelner, kucharz, recepcja.

### 5.6 Grafik

Grafik jest generowany dla konkretnego zespołu i konkretnego tygodnia.

Grafik może mieć status:

- draft — wersja robocza,
- published — opublikowany,
- archived — archiwalny.

Pracownicy powinni widzieć tylko opublikowany grafik albo własne przypisane zmiany, zależnie od decyzji UX.

W MVP przyjmujemy:

- manager widzi każdy grafik,
- pracownik widzi swój grafik po publikacji.

---

## 6. Zakres MVP v1

MVP v1 zawiera następujące funkcje:

### 6.1 Auth

- rejestracja użytkownika,
- logowanie użytkownika,
- wylogowanie,
- ochrona tras dla zalogowanych użytkowników.

### 6.2 Teamy

- utworzenie zespołu,
- wygenerowanie kodu dołączenia,
- dołączenie do zespołu przez kod,
- lista zespołów użytkownika,
- widok szczegółów zespołu,
- lista członków zespołu.

### 6.3 Role i uprawnienia

- owner/manager może zarządzać grafikiem,
- employee może zarządzać tylko swoją dostępnością,
- employee widzi tylko swoje zmiany,
- manager widzi dostępność i grafik całego zespołu.

### 6.4 Dostępność

- pracownik może dodać dostępność na konkretny dzień,
- pracownik może edytować swoją dostępność,
- manager może widzieć dostępność wszystkich członków zespołu,
- dostępność jest przypisana do zespołu i użytkownika.

### 6.5 Wymagane zmiany

- manager może utworzyć wymagane zmiany dla tygodnia,
- manager może określić datę, godziny i liczbę potrzebnych osób,
- manager może edytować lub usunąć wymaganą zmianę.

### 6.6 Generowanie grafiku

- manager klika „Wygeneruj grafik”,
- system tworzy propozycję obsady zmian,
- system bierze pod uwagę dostępność pracowników,
- system bierze pod uwagę maksymalną liczbę godzin tygodniowo, jeżeli jest ustawiona,
- system pokazuje ostrzeżenia, jeśli nie uda się obsadzić zmiany.

### 6.7 Edycja grafiku

- manager może ręcznie dodać pracownika do zmiany,
- manager może usunąć pracownika ze zmiany,
- manager może zmienić obsadę przed publikacją,
- manager może opublikować grafik.

### 6.8 Widok pracownika

Pracownik widzi:

- swoje zespoły,
- swoją dostępność,
- swoje zmiany,
- łączną liczbę godzin w tygodniu.

### 6.9 Widok managera

Manager widzi:

- swoje zespoły,
- członków zespołu,
- dostępność zespołu,
- wymagane zmiany,
- wygenerowany grafik,
- liczbę godzin przypisanych każdemu pracownikowi,
- ostrzeżenia dotyczące braków w grafiku.

---

## 7. Funkcje poza MVP

Tych funkcji nie robimy w pierwszej wersji, ale warto je zapisać jako pomysły na później:

- zamiana zmian między pracownikami,
- akceptacja zamiany przez managera,
- prośby o wolne,
- urlopy,
- powiadomienia email,
- powiadomienia push,
- eksport grafiku do PDF,
- eksport grafiku do Excela,
- integracja z Google Calendar,
- stanowiska/role na zmianach,
- kilka lokalizacji jednej firmy,
- historia zmian grafiku,
- komentarze do grafiku,
- sprawiedliwe rozdzielanie weekendów,
- minimalna liczba godzin miesięcznie,
- maksymalna liczba godzin miesięcznie,
- miesięczne rozliczenia godzin,
- dashboard statystyczny,
- ocena jakości grafiku,
- aplikacja mobilna.

---

## 8. Proponowane widoki aplikacji

### 8.1 Publiczne

```txt
/
/auth/login
/auth/register
```

### 8.2 Dashboard

```txt
/dashboard
```

Dashboard pokazuje:

- zespoły użytkownika,
- najbliższe zmiany,
- szybkie akcje, np. „Utwórz zespół”, „Dołącz do zespołu”, „Uzupełnij dostępność”.

### 8.3 Teamy

```txt
/teams
/teams/new
/teams/join
/team/[teamId]
```

### 8.4 Dostępność

```txt
/team/[teamId]/availability
```

Dla pracownika:

- widok własnej dostępności,
- formularz dodawania dostępności.

Dla managera:

- widok dostępności całego zespołu.

### 8.5 Grafik

```txt
/team/[teamId]/schedule
/team/[teamId]/schedule/new
/team/[teamId]/schedule/generate
```

Dla managera:

- tworzenie wymaganych zmian,
- generowanie grafiku,
- edycja grafiku,
- publikacja.

Dla pracownika:

- widok własnych zmian.

### 8.6 Członkowie zespołu

```txt
/team/[teamId]/members
```

Manager widzi:

- listę członków,
- role,
- limity godzin,
- statystyki godzin.

### 8.7 Ustawienia zespołu

```txt
/team/[teamId]/settings
```

Owner/manager może:

- zmienić nazwę zespołu,
- zobaczyć kod dołączenia,
- zresetować kod dołączenia.

---

## 9. Wstępny model danych

### 9.1 users

Tabela użytkowników może być częściowo obsługiwana przez Supabase Auth. Dodatkowo możemy mieć własną tabelę profili.

```txt
profiles
- id UUID PRIMARY KEY
- email TEXT NOT NULL
- full_name TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### 9.2 teams

```txt
teams
- id UUID PRIMARY KEY
- name TEXT NOT NULL
- owner_id UUID REFERENCES profiles(id)
- join_code TEXT UNIQUE NOT NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### 9.3 team_members

```txt
team_members
- id UUID PRIMARY KEY
- team_id UUID REFERENCES teams(id)
- user_id UUID REFERENCES profiles(id)
- role TEXT NOT NULL
- weekly_hours_min INTEGER
- weekly_hours_target INTEGER
- weekly_hours_max INTEGER
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

Role:

```txt
owner
manager
employee
```

### 9.4 availability

```txt
availability
- id UUID PRIMARY KEY
- team_id UUID REFERENCES teams(id)
- user_id UUID REFERENCES profiles(id)
- date DATE NOT NULL
- start_time TIME NOT NULL
- end_time TIME NOT NULL
- type TEXT DEFAULT 'available'
- note TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### 9.5 shift_requirements

```txt
shift_requirements
- id UUID PRIMARY KEY
- team_id UUID REFERENCES teams(id)
- date DATE NOT NULL
- start_time TIME NOT NULL
- end_time TIME NOT NULL
- required_people INTEGER NOT NULL
- created_by UUID REFERENCES profiles(id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### 9.6 schedules

```txt
schedules
- id UUID PRIMARY KEY
- team_id UUID REFERENCES teams(id)
- week_start_date DATE NOT NULL
- status TEXT NOT NULL
- created_by UUID REFERENCES profiles(id)
- published_at TIMESTAMP
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

Statusy:

```txt
draft
published
archived
```

### 9.7 shifts

```txt
shifts
- id UUID PRIMARY KEY
- schedule_id UUID REFERENCES schedules(id)
- date DATE NOT NULL
- start_time TIME NOT NULL
- end_time TIME NOT NULL
- required_people INTEGER NOT NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### 9.8 shift_assignments

```txt
shift_assignments
- id UUID PRIMARY KEY
- shift_id UUID REFERENCES shifts(id)
- user_id UUID REFERENCES profiles(id)
- assigned_by UUID REFERENCES profiles(id)
- created_at TIMESTAMP
```

---

## 10. Pierwsza wersja algorytmu generowania grafiku

Algorytm MVP nie musi być idealnym solverem optymalizacyjnym. Ma generować sensowną propozycję, którą manager może poprawić.

### Wejście algorytmu

- lista wymaganych zmian,
- lista pracowników zespołu,
- dostępność pracowników,
- aktualna liczba godzin przypisana każdemu pracownikowi,
- maksymalna liczba godzin tygodniowo, jeśli ustawiona.

### Wyjście algorytmu

- wygenerowany grafik,
- przypisania pracowników do zmian,
- lista ostrzeżeń.

### Prosty schemat działania

```txt
Dla każdej wymaganej zmiany:
  1. Znajdź pracowników dostępnych w czasie tej zmiany.
  2. Usuń pracowników, którzy przekroczyliby limit godzin.
  3. Posortuj kandydatów po najmniejszej liczbie aktualnie przypisanych godzin.
  4. Przypisz wymaganą liczbę pracowników.
  5. Jeśli brakuje osób, dodaj ostrzeżenie.
```

### Przykład ostrzeżeń

```txt
Brakuje 1 osoby na zmianę 2026-05-18 16:00–22:00.
Pracownik Jan Kowalski przekroczyłby limit 40h tygodniowo.
Nie znaleziono dostępnych pracowników na zmianę sobotnią.
```

---

## 11. Zasady uprawnień

### Employee

Employee może:

- odczytać swoje członkostwa w zespołach,
- odczytać podstawowe dane zespołu, do którego należy,
- tworzyć i edytować własną dostępność,
- odczytać własne przypisane zmiany,
- odczytać swój tygodniowy bilans godzin.

Employee nie może:

- edytować grafiku,
- widzieć prywatnych danych innych pracowników poza podstawową listą zespołu, jeśli zdecydujemy ją pokazać,
- usuwać członków zespołu,
- publikować grafiku,
- zmieniać ustawień zespołu.

### Manager/Owner

Manager/Owner może:

- odczytać członków zespołu,
- odczytać dostępność zespołu,
- tworzyć i edytować wymagane zmiany,
- generować grafik,
- edytować grafik,
- publikować grafik,
- zarządzać podstawowymi ustawieniami zespołu.

---

## 12. Kryteria ukończenia MVP

MVP uznajemy za ukończone, jeśli:

- użytkownik może się zarejestrować i zalogować,
- manager może utworzyć zespół,
- pracownik może dołączyć do zespołu przez kod,
- pracownik może uzupełnić dostępność,
- manager widzi dostępność zespołu,
- manager może utworzyć wymagane zmiany,
- manager może wygenerować grafik,
- manager może ręcznie poprawić grafik,
- manager może opublikować grafik,
- pracownik widzi swoje opublikowane zmiany,
- system poprawnie pilnuje podstawowych uprawnień,
- podstawowa logika generowania grafiku ma testy.

---

## 13. Plan implementacji

### Etap 1 — Setup projektu

- utworzenie projektu Next.js,
- konfiguracja TypeScript,
- konfiguracja Tailwind,
- instalacja shadcn/ui,
- utworzenie projektu Supabase,
- konfiguracja `.env`,
- konfiguracja Drizzle.

### Etap 2 — Auth

- Supabase Auth,
- rejestracja,
- logowanie,
- wylogowanie,
- ochrona tras,
- tabela `profiles`.

### Etap 3 — Teamy

- tworzenie zespołu,
- generowanie kodu dołączenia,
- dołączanie do zespołu,
- lista zespołów użytkownika,
- widok członków zespołu.

### Etap 4 — Dostępność

- formularz dostępności,
- zapis dostępności,
- edycja dostępności,
- widok dostępności managera.

### Etap 5 — Wymagane zmiany

- tworzenie zmian,
- edycja zmian,
- usuwanie zmian,
- widok tygodniowy.

### Etap 6 — Generator grafiku

- funkcja generująca grafik,
- przypisywanie pracowników,
- wykrywanie braków,
- ostrzeżenia,
- zapis grafiku jako draft.

### Etap 7 — Edycja i publikacja grafiku

- ręczna edycja przypisań,
- publikacja grafiku,
- widok pracownika.

### Etap 8 — Testy i stabilizacja

- testy logiki generatora,
- testy uprawnień,
- poprawki UX,
- deployment na Vercel.

---

## 14. Decyzje przyjęte na start

- Użytkownik nie ma globalnego typu konta.
- Rola użytkownika zależy od zespołu.
- Dołączanie do zespołu odbywa się przez kod.
- Baza danych to PostgreSQL w Supabase.
- ORM to Drizzle.
- Frontend i backend będą w Next.js.
- Pierwszy generator grafiku będzie prostą heurystyką, nie zaawansowanym solverem.
- MVP ma działać dobrze dla jednego zespołu i tygodniowego grafiku.
- Funkcje zaawansowane zostają zapisane na później.

---

## 15. Następny krok

Następny krok techniczny to utworzenie projektu Next.js i przygotowanie środowiska developerskiego.

Minimalny cel kolejnego etapu:

```txt
Projekt uruchamia się lokalnie.
Działa Tailwind.
Działa podstawowy layout.
Mamy przygotowaną strukturę folderów.
Mamy plan podłączenia Supabase i Drizzle.
```
