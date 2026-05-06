# HN Pulse — 제품 및 기술 명세서

> Hacker News의 장기 핵심 지표(vitals)를 매일 갱신하여 보여주는 단일 페이지 공개 분석 대시보드. **hnpulse.hena.dev** 에서 호스팅하며, **영구적으로 $0** 운영을 목표로 한다.

---

## 1. 프로젝트 개요

| 항목              | 값 |
| ----------------- | -- |
| 제품명            | **HN Pulse** (표시용) / `hnpulse` (slug) |
| 태그라인          | "Hacker News, daily vitals" |
| 프로덕션 URL      | https://hnpulse.hena.dev |
| 저장소            | https://github.com/hena-dev/hnpulse (public, MIT) |
| 소유자            | hena-dev (hi@hena.dev) |
| GCP 프로젝트      | `molu-486406` (재사용) |
| 비용 목표         | **USD $0 영구** (라이프타임, 정기 지출 없음) |
| 갱신 주기         | 매일 1회 **14:00 UTC** (BQ 공개 데이터셋 갱신 직후 약 1시간 뒤) |
| 데이터 윈도우     | 롤링 **최근 2년** (이전 데이터는 폐기) |

이 제품은 Hacker News 커뮤니티의 가장 중요한 비즈니스/서비스 지표(제출량, 참여도, 이용자 규모, 콘텐츠 품질, 출처 다양성)를 시각화하는 한 페이지짜리 임원용 KPI 대시보드다. 대시보드는 설정 가능한 시간 범위 보기(1w / 1m / 3m / 6m / 1y / 2y)를 지원하며, 각 KPI에 대해 기간 대비 증감률(period-over-period delta)과 추세 스파크라인을 함께 표시하고, 그 아래에 소수의 상세 차트를 둔다.

> **왜 14:00 UTC인가?** `bigquery-public-data.hacker_news.full`의 `lastModifiedTime`을 직접 조회한 결과, 일일 갱신은 약 **13:00 UTC** 부근에 실행됨이 확인되었다 (관측: 2026-05-03 13:06 UTC). 14:00 UTC는 약 1시간의 여유 버퍼를 제공하며, 파이프라인은 추가로 신선도 체크(§8.2)를 수행해 소스가 아직 갱신되지 않았다면 정상 종료한다.

---

## 2. 목표와 비목표

### 2.1 목표
1. HN의 장기 트렌드와 현재 맥박을 5초 이내에 파악할 수 있게 한다.
2. 사용하는 모든 서비스(GCP/BigQuery, GitHub, Cloudflare)의 무료 한도 안에서 엄격하게 운영한다.
3. 완전히 오픈소스로 공개하고 재현 가능하게 만든다.
4. 빠르고(LCP < 1.5s on 3G), 접근성 있고, 모바일 우선으로 설계한다.
5. 자격증명 로테이션 외의 수동 유지보수 없이 수년간 운영을 견딘다.

### 2.2 명시적 비목표 (v1)
- 사용자 단위 페이지나 사용자별 조회는 없음 (프라이버시 + 범위).
- 실시간 / 일 단위 미만 갱신은 없음 (Firebase API 폴링 없음).
- v1에는 NLP / 감정 분석 / 텍스트 분석 없음 *(다만, 향후 텍스트 기반 기능을 재부트스트랩 없이 만들 수 있도록 원시 `text` 컬럼은 **그대로 보존**한다; §8.3 참고)*.
- 다른 소셜 플랫폼과의 비교는 없음.
- PWA / 오프라인 지원은 없음.
- 사용자 데이터를 생성하는 인터랙티브 요소는 없음 (댓글, 좋아요, 계정 등).
- 유료 등급 없음, 계정 없음, 영구히.
- Cloudflare Worker 런타임 코드 없음 — Workers는 **오직** 정적 자산 서빙에만 사용된다 (§10).

---

## 3. 제약 사항 (하드)

| 제약                                          | 함의 |
| --------------------------------------------- | ---- |
| BigQuery 무료 한도: 월 1 TB 스캔             | 1회 실행당 풀 테이블 스캔은 **17.75 GB** (dry-run으로 검증, §8.3 참고). 1일 1회 실행 = ~533 GB/월 → **무료 한도의 약 52 %**, HN이 약 1.9× 성장할 때까지 여유. `maxBytesBilled`를 쿼리당 하드 캡으로 적용. |
| BigQuery 스토리지 무료 한도: 10 GB           | BigQuery 내부에는 데이터를 절대 저장하지 않음; 원시 행은 GitHub Releases에 Parquet으로 보관 |
| GitHub Actions 무료 한도 (퍼블릭 레포)       | 무제한 분 — 안전 확인됨 |
| Cloudflare Workers 무료 플랜                  | Worker 호출에 대한 100k req/day 소프트 리밋은 **무관함** — Worker를 실행하지 않기 때문. 정적 자산만 서빙되며 정적 자산은 미터링 없음 |
| GitHub Releases 자산 수                       | 릴리즈당 실용적 한도 ~1000개; 730개의 일일 Parquet 파일은 여유롭게 수용 |
| GCP 빌링                                       | 빌링 계정은 **오직** 예산 알림 용도로만 연결; 예산 알람 **$0.01** + 쿼리당 `maxBytesBilled` 캡 |

---

## 4. 사용자 경험

### 4.1 페이지 레이아웃 (single page, mobile-first)

```
┌─────────────────────────────────────────────────────────┐
│ [HN Pulse logo]                       [theme] [github] │  <- sticky header
├─────────────────────────────────────────────────────────┤
│ Range: ( 1w  [1m]  3m  6m  1y  2y )       as of: ...   │  <- range selector
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │ Stories │ │Comments │ │Active   │ │Active   │         │  <- KPI grid (4-col desktop,
│ │  /day   │ │ /day    │ │Commenters│ │Submitters│         │     2-col tablet,
│ │  1,234  │ │  9,876  │ │  4,321  │ │  1,098  │         │     1-col mobile)
│ │ +5.2%▲  │ │ −1.1%▼  │ │ +3.4%▲  │ │ +0.8%▲  │         │
│ │ ╱╲╱╲╱╲  │ │ ╲╱╲╱╲╱  │ │ ╱╲╱╱╲╱  │ │ ╱╱╲╱╲╱  │         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │Median   │ │Comments │ │Success  │ │Top dom. │         │
│ │Score    │ │/Story   │ │Rate     │ │Share    │         │
│ │ ...     │ │ ...     │ │ ...     │ │ ...     │         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│ │Show HN  │ │Ask HN   │ │Jobs     │                     │
│ │ ...     │ │ ...     │ │ ...     │                     │
│ └─────────┘ └─────────┘ └─────────┘                     │
├─────────────────────────────────────────────────────────┤
│  [ Chart 1: Stories vs Comments  (stacked area) ]       │
│  [ Chart 2: Active users         (line)         ]       │
│  [ Chart 3: Top 10 domains       (h-bar)        ]       │
│  [ Chart 4: Median + p90 score   (line)         ]       │
├─────────────────────────────────────────────────────────┤
│ Built by hena · Repo · last updated 2026-05-04 14:03 UTC│
└─────────────────────────────────────────────────────────┘
```

### 4.2 범위 선택기 (Range Selector)
- 옵션: **1w, 1m, 3m, 6m, 1y, 2y**.
- **기본값: 1m**.
- 선택은 URL 쿼리에 반영됨: `?range=6m`.
- 쿼리 파라미터가 없을 때의 폴백으로 `localStorage`에 선택값을 저장.
- 범위를 클릭하면 모든 KPI 숫자, 델타, 스파크라인, 상세 차트가 즉시 다시 렌더링됨 (네트워크 왕복 없음; 모든 데이터는 `kpis.json`에 들어 있음).

### 4.3 일자 경계
- 모든 일자는 **UTC** 일자다 (HN의 unix timestamp와 일치; DST 없음).
- 대시보드는 부분 일자 데이터를 절대 표시하지 않는다; 어떤 차트에서든 가장 최근 포인트는 **가장 최근의 완전한 UTC 일자**(보통 어제)다.
- "1w" = 가장 최근의 완전한 UTC 일자에서 끝나는 후행 7개의 완전한 UTC 일자.

### 4.4 차트의 시간 버킷팅
선택된 범위에 따라 자동 선택됨:

| 범위           | 버킷    |
| -------------- | ------- |
| 1w, 1m, 3m     | daily   |
| 6m, 1y         | weekly  |
| 2y             | monthly |

### 4.5 Y축 스케일
- **기본은 선형(Linear).**
- 선택된 범위에서 값이 두 자릿수 이상의 자릿수를 가로지르는 차트에서만 **Log 토글**이 나타남.

### 4.6 테마와 접근성
- 다크가 기본; 토글로 라이트 테마 사용 가능.
- 첫 방문 시 테마는 `prefers-color-scheme`도 자동 존중.
- 컬러 토큰은 **shadcn 스캐폴드 기본값**을 따름 (커스텀 primary 오버라이드 없음).
- 두 테마 모두에서 WCAG AA 명도 대비 최소치 확보.
- 키보드 내비게이션 가능; 차트는 ARIA 레이블과 스크린 리더/검색 엔진을 위한 숨겨진 `<table>` 폴백을 가짐.

---

## 5. KPI 카탈로그

모든 KPI는 선택된 범위에 대해 계산되며 **{숫자} + {이전 동등 기간 대비 델타} + {선택된 범위를 반영하는 스파크라인}** 형태로 렌더링됨.

| # | KPI                                | 정의 |
| - | ---------------------------------- | ---- |
| 1 | **Stories per day**                | COUNT(items WHERE `type='story'` 또는 `type IN ('poll','pollopt')`) AND NOT `deleted` AND NOT `dead`, UTC 일자별로 그룹화한 뒤 선택된 범위 전체에 대해 평균. |
| 2 | **Comments per day**               | COUNT(items WHERE `type='comment'`) AND NOT `deleted` AND NOT `dead`. |
| 3 | **Active commenters per day**      | COUNT(DISTINCT `by`) WHERE `type='comment'` per UTC 일자, 평균. (HN에서 DAU에 가장 가까운 프록시.) |
| 4 | **Active submitters per day**      | COUNT(DISTINCT `by`) WHERE `type='story'` per UTC 일자, 평균. |
| 5 | **Median / p90 story score**       | 범위 내 스토리에 대한 APPROX_QUANTILES(`score`, 100)[50] 및 [90]. 한 카드에 둘 다 표시. |
| 6 | **Comments per story**             | SUM(comments) / SUM(stories) — 참여도 비율. 카드는 범위 전체의 평균값을 표시. |
| 7 | **Success rate (≥100)**            | COUNT(stories WHERE `score >= 100`) / COUNT(stories), 백분율. |
| 8 | **Top domains share**              | 카드에 "Top: github.com (5.4%)" 표시 — 선택된 범위에서 #1 도메인과 그 점유율. 상위 10개의 드릴다운 목록은 상세 차트에 위치. |
| 9 | **Show HN**                        | COUNT(stories WHERE `title LIKE 'Show HN:%'`) per day, 평균. |
| 10| **Ask HN**                         | COUNT(stories WHERE `title LIKE 'Ask HN:%'`) per day, 평균. |
| 11| **Jobs**                           | COUNT(items WHERE `type='job'`) per day, 평균. |
| 12| **Dead / flagged ratio** *(보조 카드, 작게)* | 범위 내 SUM(items WHERE `deleted OR dead`) / SUM(전체 items). |

### 5.1 상세 차트 (4개)

| 차트 | 유형              | 데이터 |
| ---- | ----------------- | ------ |
| 1    | Stacked area      | 선택된 범위에 대한 Stories vs. Comments. |
| 2    | Line              | 범위에 대한 활성 댓글 작성자 + 활성 제출자 (두 시리즈). |
| 3    | Horizontal bar    | 범위 내 스토리 수 기준 상위 10개 도메인, 점유율 % 라벨 포함. |
| 4    | Line              | 범위에 대한 Median + p90 스토리 점수 (두 시리즈). |

### 5.2 타입 처리

| HN `type`           | 처리 |
| ------------------- | ---- |
| `story`             | 1급(first-class). |
| `comment`           | 1급(first-class). |
| `job`               | 별도 KPI; stories에 포함되지 않음. |
| `poll`, `pollopt`   | stories로 합쳐짐 (매우 드묾). |

### 5.3 제외 항목
- `deleted = true` — 모든 주요 KPI에서 제외.
- `dead = true` — 모든 주요 KPI에서 제외.
- 두 항목 모두 **Dead/flagged ratio** 카드에서만 노출됨.

### 5.4 도메인 추출
- 출처: 스토리의 `url` 필드.
- 알고리즘: 파싱, 소문자화, `www.` 제거 후 [Public Suffix List](https://publicsuffix.org/)를 `tldts` npm 패키지로 사용해 **registrable domain (eTLD+1)**을 취함.
- `https://blog.medium.com/foo` → `medium.com`.
- `url`이 없는 스토리(Ask HN, 텍스트 전용 Show HN)는 도메인 통계에서 제외되지만 제출 KPI에는 카운트됨.

### 5.5 기간 대비 델타 (Period-over-Period Delta)
범위가 *N* 일일 때, 델타 비교 대상:
- **현재 윈도우**: `[today - N + 1, today]`
- **이전 윈도우**: `[today - 2N + 1, today - N]`
- 공식: `(current - previous) / previous * 100`, 소수점 1자리와 ▲/▼ 글리프로 표시.
- `previous == 0`인 경우, 양의 `current`에 대해 `+∞` 표시, 그 외에는 `0%`.

---

## 6. 비주얼 디자인 시스템

### 6.1 스택
- 프로젝트는 다음으로 초기화:
  ```bash
  bunx --bun shadcn@latest init --preset b4NvEWN8q --base base --template astro
  ```
- **Astro** 정적 사이트와 인터랙티브 컴포넌트용 **React islands**.
- **shadcn/ui (Base 변형)** — `base-ui` 프리미티브 사용 (Radix 아님). 모든 shadcn 컴포넌트는 다음으로 설치:
  ```bash
  bunx --bun shadcn@latest add --all
  ```
- **Tailwind v4** (템플릿 기본).
- 패키지 매니저 및 런타임으로 **Bun**.

### 6.2 차트
- **shadcn Chart 컴포넌트** (Base 변형): https://ui.shadcn.com/docs/components/base/chart
  - 내부적으로 Recharts 기반.
  - 스파크라인과 상세 차트 모두에 사용.
- 스파크라인: 축이나 툴팁이 없는 최소화된 Recharts `<LineChart>`.
- 상세 차트: 풀 Recharts `<AreaChart>`, `<LineChart>`, `<BarChart>`.
- 모든 차트는 shadcn 차트 CSS 변수로 활성 테마를 존중함.

### 6.3 컬러 토큰
- shadcn 테마 토큰을 **스캐폴드된 그대로** 사용 — `--primary` 오버라이드 없음, 커스텀 브랜드 컬러를 디자인 시스템에 주입하지 않음.
- 양수 델타: `text-emerald-500` (light) / `text-emerald-400` (dark).
- 음수 델타: `text-rose-500` / `text-rose-400`.

### 6.4 타이포그래피
- 기본 shadcn 시스템 폰트 스택 (템플릿이 동봉한다면 Geist Sans + Geist Mono).

### 6.5 브랜딩
- 워드마크 "**HN Pulse**"는 기본 전경색으로 렌더링 (페이지에 특별한 브랜드 컬러를 주입하지 않음).
- 브랜드 컬러(HN Orange)는 오직 **`favicon.png`**가 운반함 — 파비콘과 Apple touch icon으로 사용되는 단일 512×512 PNG. 브라우저가 필요에 따라 다운스케일.
- 정적 OG 이미지: `1200×630` PNG, 워드마크 + 태그라인 포함. **디자인 시점에 한 번** 생성하여 `og.png`로 레포에 커밋.

---

## 7. 정보 아키텍처

| 경로        | 목적 |
| ----------- | ---- |
| `/`         | 대시보드 (§4에서 설명한 페이지). |
| `/about`    | 방법론 페이지: 데이터 출처, KPI 정의, 갱신 일정, 라이선스, 레포 링크. |

`/about`은 Astro로 렌더링되는 정적 MD 파일이다. 본 명세서의 §5를 사용자용 언어로 거울처럼 반영하며, 다음으로의 직접 링크를 제공한다:
- HN BigQuery 공개 데이터셋.
- 파워 유저용 현재 `kpis.json` 및 `meta.json`.
- 일일 Parquet 스냅샷을 포함하는 GitHub 릴리즈.

---

## 8. 데이터 파이프라인 아키텍처

### 8.1 상위 흐름 (일일)

```
                                ┌──────────────────────────────────────┐
                                │  GitHub Actions cron (14:00 UTC)     │
                                └──────────────────────────────────────┘
                                                │
                                                ▼
                ┌────────────────────────────────────────────────────────┐
                │  pipeline/ (Bun + TypeScript)                          │
                │                                                        │
                │  0. Freshness check: query MAX(timestamp) from BQ.     │
                │     If source is not yet refreshed for today, exit 0.  │
                │     Next cron will pick up automatically.              │
                │                                                        │
                │  1. Determine mode: bootstrap vs incremental           │
                │     (mode = "bootstrap" if no prior parquet in release)│
                │                                                        │
                │  2. Query BigQuery hacker_news.full                    │
                │     - bootstrap: WHERE timestamp >= now - 730 days     │
                │     - incremental: WHERE timestamp >= max - 7 day overlap │
                │     - SELECT *  (no column pruning — keep raw text)    │
                │     - maxBytesBilled cap enforced per query            │
                │                                                        │
                │  3. Write Parquet for each affected UTC day            │
                │     items-YYYY-MM-DD.parquet                           │
                │                                                        │
                │  4. Upload new/changed Parquet to GH Release           │
                │     `data-snapshot` (single rolling release)           │
                │     Delete assets older than 730 days                  │
                │                                                        │
                │  5. Download all Parquet files in window (~730)        │
                │                                                        │
                │  6. Run DuckDB CLI over local Parquet glob             │
                │     - Compute all daily metrics                        │
                │     - Dedup by id (idempotent)                         │
                │     - Emit kpis.<sha>.json + meta.json                 │
                │                                                        │
                │  7. Validate: each metric within 10× of 7-day median   │
                │     - On failure: abort, do not commit, exit non-zero  │
                │                                                        │
                │  8. Write JSON to /web/public/data/                    │
                │     - Update HTML to reference new hashed filename     │
                │                                                        │
                │  9. git commit `chore(data): YYYY-MM-DD [skip ci]`     │
                │     git push                                           │
                │                                                        │
                │ 10. wrangler deploy --env production                   │
                │     (deploys static assets only; no Worker code)       │
                │                                                        │
                └────────────────────────────────────────────────────────┘
```

### 8.2 부트스트랩 vs 증분 로직

단일 워크플로우, 단일 코드 경로, 조건부 동작:

```ts
// 0. Freshness check
const [{ max_ts }] = await bq.query(`
  SELECT MAX(timestamp) AS max_ts
  FROM \`bigquery-public-data.hacker_news.full\`
`);
const expectedFreshUntil = new Date();
expectedFreshUntil.setUTCHours(0, 0, 0, 0);                 // start of today UTC
expectedFreshUntil.setUTCDate(expectedFreshUntil.getUTCDate() - 1);  // we expect data through "yesterday"
if (new Date(max_ts) < expectedFreshUntil) {
  console.log("BQ source not yet refreshed; exiting cleanly.");
  process.exit(0);                                          // next cron will retry
}

// 1. Mode
const release = await gh.getRelease("data-snapshot");
const existingParquets = release.assets.filter(a => a.name.startsWith("items-"));
const mode = existingParquets.length === 0 ? "bootstrap" : "incremental";

const since =
  mode === "bootstrap"
    ? Date.now() - 730 * 86400 * 1000
    : maxTimestampInExisting - 7 * 86400 * 1000;            // 7-day overlap

// 2. Query — full row, no column pruning
const rows = await bq.query(`
  SELECT *
  FROM \`bigquery-public-data.hacker_news.full\`
  WHERE timestamp >= TIMESTAMP_SECONDS(@since)
`, {
  since: Math.floor(since / 1000),
  maxBytesBilled: 50 * 1024 * 1024 * 1024,                  // 50 GB cap
});
```

7일 오버랩은 공개 데이터셋에 늦게 도착하는 행에 대한 방어이고, id 기반 중복 제거 단계로 재인제스트가 안전해진다.

### 8.3 BigQuery 쿼리 프로파일

- **소스 테이블**: `bigquery-public-data.hacker_news.full`
  - 검증된 상태 (2026-05-03 조회): `numRows = 47,949,041`, `numBytes = 17.75 GB`, **파티션 없음, 클러스터링 없음**.
  - 스키마 (14 컬럼): `title, url, text, dead, by, score, time, timestamp, type, id, parent, descendants, ranking, deleted`.
- **컬럼 정책**: **`SELECT *`** — `text`를 포함한 **모든 컬럼**을 그대로 보존. 이로써 NLP, 검색, 전체 텍스트 트렌드 등 향후 사용 사례를 같은 Parquet 스냅샷 위에서 **재부트스트랩 없이** 구축할 수 있다.
- **실행당 스캔 바이트** (`dryRun=true`로 검증):
  - 풀 테이블 `SELECT *` → **17.75 GB**.
  - `WHERE timestamp >= ...` 절은 스캔을 **줄이지 않음** (테이블이 파티션 처리되어 있지 않음).
  - 7일 오버랩과 730일 부트스트랩 모두 동일한 17.75 GB 스캔에 도달한다; 전송되는 결과 행만 다를 뿐.
- **월간 추정 스캔량**: 1일 1회 실행 시 **~533 GB / 월** → 1 TB 무료 한도의 ~52 %. HN이 ~1.9× 성장할 때까지의 여유.
- **`maxBytesBilled`**는 모든 쿼리에 **50 GB**를 하드 캡으로 설정. 이를 초과하는 쿼리는 빠르게 실패하며 **과금되지 않는다**.
- **향후 비용 지렛대** (HN이 두 배가 될 경우): 자체 유지하는 파티션 미러를 두고 `WHERE timestamp >= ... AND _PARTITIONTIME ...`으로 전환하거나, 증분 Firebase API 인제스트로 폴백. v1 범위 외.

### 8.4 스토리지 레이아웃

#### GitHub Release `data-snapshot`
- `data-snapshot` 태그가 붙은 단일 롤링 릴리즈.
- 자산: `items-YYYY-MM-DD.parquet` (UTC 일자당 1개).
- 각각 ~5–8 MB 압축 (`text` 컬럼 포함 풀 row).
- 파이프라인 일일 작업:
  - 오늘의 새 Parquet 자산 추가.
  - 7일 오버랩이 변경분을 가져왔다면 오늘/최근 일자 갱신.
  - 날짜가 `today - 730d` 미만인 자산은 모두 삭제.
- 정상 상태 자산 수: ~730 (GH의 실용 한도보다 훨씬 적음).
- 정상 상태 릴리즈 총 크기: ~4–6 GB.

#### 레포 `/web/public/data/`
- `kpis.<sha>.json` — 730일 윈도우 전체에 대해 모든 KPI의 일별 시리즈.
- `kpis-current.json` — 가장 최신의 해시된 파일에 대한 심링크/복사본 (`/about` 페이지 원시 다운로드 링크용).
- `meta.json` — 해시되지 않은 작은 파일, 현재 `kpis.<sha>.json` 파일명에 대한 포인터 포함.

### 8.5 DuckDB 집계
- 글롭으로 모든 Parquet 파일 읽기:
  ```sql
  CREATE VIEW items AS
  SELECT * FROM read_parquet('./tmp/items-*.parquet') ;
  ```
- 모든 일별 집계를 한 번에 계산하는 단일 SQL 스크립트 실행 (단일 `GROUP BY date_trunc('day', timestamp)`).
- 중복 제거에 `SELECT DISTINCT id` 또는 `QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY timestamp DESC) = 1` 사용.
- `COPY (...) TO 'kpis.json' (FORMAT JSON, ARRAY true);`로 JSON 출력 후 TS에서 후처리하여 `schemaVersion` 추가, 파일명 해시화, `meta.json` 작성.

### 8.6 검증 게이트 (Validation Gate)
어떤 커밋이든 직전에:
1. 새 출력의 각 일별 메트릭에 대해 **새 값을 제외한** 7일 중앙값 대비 비율을 계산.
2. **어느 한 메트릭이라도** `ratio > 10×` 또는 `ratio < 0.1×` 이면 중단:
   - 파이프라인은 0이 아닌 상태로 종료.
   - GHA가 레포 소유자에게 이메일 발송.
   - 이슈가 해결될 때까지 새 JSON은 커밋되지 않으며, 사이트는 직전의 양호한 데이터를 계속 서빙.

---

## 9. 프론트엔드 구현

### 9.1 빌드와 번들
- Astro 정적 출력 (`output: 'static'`).
- 필요한 곳에만 React islands 하이드레이션 (범위 선택기, 테마 토글, 차트 컴포넌트).
- 공식 Astro 통합을 통한 Tailwind v4.
- Vite (Astro에 번들됨)가 `data/kpis.*.json`의 `import.meta.glob`을 통한 JSON 콘텐츠 해싱 처리.
- 번들 목표: 모든 islands 합산 **JS < 150 KB gzipped**.

### 9.2 데이터 로딩
- 빌드 시: `meta.json`을 빌드 시점에 읽어 현재 `kpis.<sha>.json` 파일명을 HTML에 `<link rel="preload" as="fetch" href="/data/kpis.<sha>.json">`로 굽는다.
- 런타임: 대시보드의 첫 페인트에서 단일 `fetch('/data/kpis.<sha>.json')` 호출.
- 모든 범위 전환은 클라이언트 측 필터링 — 추가 요청 없음.

### 9.3 URL 상태
- `?range=<id>` 여기서 `id ∈ {1w,1m,3m,6m,1y,2y}`.
- 파라미터 없으면 기본 1m.
- 변경 시마다 `localStorage.hnpulse.range`에 기록; `?range`가 없을 때만 읽음.

### 9.4 성능 예산 (CI에서 강제)
| 메트릭                | 목표 |
| --------------------- | ---- |
| LCP (3G Fast)         | < 1.5 s |
| CLS                   | < 0.05 |
| Total JS (gz)         | < 150 KB |
| Total CSS (gz)        | < 30 KB |
| Lighthouse all        | ≥ 95 |

Lighthouse CI는 모든 PR에서 실행되며 실패 시 머지가 차단됨.

### 9.5 접근성
- 모든 인터랙티브 요소는 문서 순서대로 키보드로 도달 가능.
- 모든 차트에 ARIA 레이블 (`role="img" aria-label="..."`).
- 각 차트는 기저 숫자에 대한 `<sr-only>` `<table>`을 동반 (SEO에도 유리).
- 색상이 정보의 유일한 전달자가 되지 않음 (델타 화살표는 글리프이기도 함).

### 9.6 캐싱 헤더 (Cloudflare)
- 해시된 자산 (`/data/kpis.*.json`, `/_astro/*`):
  `Cache-Control: public, max-age=31536000, immutable`
- HTML과 `meta.json`:
  `Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400`

---

## 10. 호스팅과 배포

### 10.1 Cloudflare Workers — 정적 자산 전용
- `wrangler.jsonc`에 구성된 `wrangler`로 배포.
- 모던한 **Workers Static Assets** 기능을 **자산 전용 모드**로 사용: Worker 스크립트가 **없고**, `main` 엔트리도 없으며, Cloudflare 위에서 실행되는 런타임 코드도 없다. Worker 플랫폼은 Astro `dist/` 출력의 CDN 역할로만 쓰인다.
- 커스텀 도메인: Cloudflare DNS를 통해 `hnpulse.hena.dev` 연결 (`hena.dev`가 Cloudflare에 있다고 가정).
- HTTPS, HTTP/3, Brotli, HSTS는 Worker 코드가 아니라 Cloudflare 존(zone) 레벨(대시보드 설정)에서 활성화.

### 10.2 `wrangler.jsonc` 스켈레톤

```jsonc
{
  "$schema": "https://unpkg.com/wrangler/config-schema.json",
  "name": "hnpulse",
  "compatibility_date": "2026-05-01",
  // No `main` — assets-only deployment.
  "assets": {
    "directory": "./web/dist",
    "not_found_handling": "404-page"
  },
  "routes": [
    { "pattern": "hnpulse.hena.dev", "custom_domain": true }
  ],
  "observability": { "enabled": true }
}
```

### 10.3 환경
- **production**: 매 일별 데이터 커밋 후 `main`에서 배포.
- **preview**: 모든 PR은 `wrangler versions upload`로 배포 (Cloudflare가 자동으로 미리보기 URL 생성). 자산 전용 배포는 Worker 코드가 없어도 미리보기 URL을 기본 지원.

### 10.4 보안 헤더 (Worker 없음 → meta + zone 사용)
Worker 핸들러가 없으므로, 응답 헤더 커스터마이징은 다음으로 제한된다:
- **Cloudflare zone 설정**: HSTS (`Strict-Transport-Security`), Always Use HTTPS, Cloudflare 기본값에 의한 자동 `X-Content-Type-Options: nosniff`.
- `Content-Security-Policy`와 `Referrer-Policy`는 HTML `<meta>` 태그로:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://static.cloudflareinsights.com">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  ```
- `_headers` 파일은 Workers Static Assets에서 **지원되지 않는다**(Pages 전용 기능). 추후 응답 헤더 커스터마이징이 필요해지면 이때 얇은 Worker를 추가하는 트리거가 되며, v1 범위 외이다.

---

## 11. 인증과 시크릿

### 11.1 GCP 서비스 계정
- 로컬 개발 자격증명 파일: `/Users/chris/.config/gcloud/molu-486406-3e3f3f5157ff.json`.
- CI용: 내용을 그대로 GitHub 레포지토리 시크릿 **`GCP_SA_KEY`**에 저장.
- 파이프라인은 다음으로 읽음:
  ```ts
  const credentials = JSON.parse(process.env.GCP_SA_KEY!);
  const bq = new BigQuery({ credentials, projectId: "molu-486406" });
  ```

### 11.2 Cloudflare API 토큰
- GitHub 레포지토리 시크릿 **`CLOUDFLARE_API_TOKEN`**에 저장 (스코프: 해당 zone의 Workers Scripts: Edit, Workers Routes: Edit).
- CI에서 `wrangler`가 사용.

### 11.3 GitHub 토큰
- GHA가 제공하는 기본 `GITHUB_TOKEN`이 커밋 푸시백 및 `data-snapshot` 릴리즈 관리에 충분.

### 11.4 시크릿 로테이션
- 서비스 계정 키는 매년 로테이션; `/about` 및 `SECURITY.md` 운영 노트에 문서화.

---

## 12. 비용 통제 (Defense in Depth)

| 계층                     | 메커니즘 |
| ------------------------ | -------- |
| GCP 프로젝트 빌링        | 예산 알람 **$0.01**에서 즉시 이메일 발송. |
| BigQuery 쿼리당          | 모든 쿼리에 `maxBytesBilled: 50 * 1024**3` (50 GB) 캡. |
| BigQuery 월간            | 사용자 정의 쿼터: IAM & Admin → Quotas에서 `Query usage per day`를 **50 GB/day**로 설정 (1회 성공 실행 = ~17.75 GB; 캡은 하루 최대 ~2회 재시도분의 여유를 남긴 뒤 추가 작업을 차단). |
| GitHub Actions           | 퍼블릭 레포 → 무제한 무료; 캡 불필요. |
| Cloudflare Workers       | 정적 자산 전용 배포; 자산은 미터링 없음. Worker 호출은 일어나지 않음. |
| Cloudflare Web Analytics | 무료, 무제한. |

위 중 하나라도 발동되면 파이프라인은 GHA 이메일로 큰 소리로 실패하고, 라이브 대시보드는 마지막으로 알려진 양호한 데이터로 계속 서빙됨.

---

## 13. 품질, 검증, 운영

### 13.1 파이프라인 자체 테스트
- 들어오는 BQ 행의 스키마 체크 (컬럼 타입이 예상과 일치).
- 행 수 > 0.
- 날짜 커버리지 체크: 윈도우 내 모든 일자에 ≥ 1 스토리 (HN은 0인 날이 없음).
- 메트릭별 이상치 체크 (10× 규칙, §8.6).

### 13.2 프론트엔드 스모크 테스트 (CI)
- Astro 빌드 성공.
- 빌드 출력에 대한 Lighthouse CI.
- Playwright 체크: 페이지 렌더링, 범위 선택기 응답, 콘솔 에러 없음.

### 13.3 관측 가능성
- GHA 내장 워크플로우 실패 이메일을 레포 소유자에게.
- README 배지: `daily.yml`의 워크플로우 상태.
- 트래픽 가시성을 위한 Cloudflare Web Analytics (쿠키 없음, 배너 불필요).
- v1에는 서드파티 에러 모니터링(Sentry 등) 없음 — $0 유지를 위해 범위 외.

---

## 14. 엔지니어링 규약 (Engineering Conventions)

이 규칙들은 **사회적 압박이 아니라 CI로 강제**된다. §14.9에 나열된 모든 게이트는 머지 전에 통과해야 한다.

### 14.1 TypeScript 컴파일러 — TypeScript 7.0 Beta (`tsgo`)

- **컴파일러**: [TypeScript 7.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/) (Go 기반 재작성, 6.0보다 약 10배 빠름). 설치:
  ```bash
  bun add -d @typescript/native-preview@beta
  ```
- 모든 TypeScript 작업은 **`tsgo`** 바이너리를 통해 실행 (`tsc` 대신):
  ```bash
  bunx tsgo --noEmit                    # 타입체크 (CI 게이트)
  bunx tsgo --noEmit --watch            # 로컬 watch 모드
  ```
- `typescript` 패키지를 직접 import하는 도구(예: 일부 에디터 통합, Biome의 옵션 type-aware 모드)를 위해 `package.json`에 TypeScript 6 alias 설정:
  ```jsonc
  { "devDependencies": { "typescript": "npm:@typescript/typescript6@^6.0.0" } }
  ```
- CI에서는 `--checkers 2`로 고정 (CI 러너는 2 vCPU); 로컬에서는 기본값 사용 가능.

### 14.2 `tsconfig.json` 베이스라인 (전역 strict)

```jsonc
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,                          // TS 7 기본값; 명시적으로 설정
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,    // TS 7 기본값
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": []                              // TS 7 기본값; 패키지별로 opt-in
  }
}
```
패키지별 `tsconfig.json`은 레포 루트의 공유 베이스를 extend.

### 14.3 타입 규율 — Zero Escape Hatch

다음은 **금지**되며 CI 린트에서 실패한다:
- `as any`, `as unknown`, `as never`
- `// @ts-ignore`, `// @ts-expect-error` *(`TODO(#issue)` 정당화 코멘트가 있는 경우만 허용 — 30일 넘은 ignore는 CI 실패)*
- `// biome-ignore` *(같은 규칙)*
- non-null assertion 연산자 `!` (`x!.foo`)
- 모든 어노테이션의 `any` 타입
- 유니언이나 제네릭으로 충분한 경우의 함수 오버로드

경계 규율(Boundary discipline):
- **모든** 외부 입력(BigQuery 행, 파일 내용, 환경변수, fetch 응답, CLI 인자)은 시스템 경계에서 **`zod`** (또는 `valibot`) 스키마를 통해 파싱된다. 내부 코드는 검증되고 좁게 타입 지정된 값만 받는다.
- `kpis.json`과 `meta.json`의 형태는 `pipeline/src/schema/`에 단일 zod 스키마로 정의되며, 파이프라인(출력)과 웹(입력) 양쪽에서 **재사용**된다.

### 14.4 코드 조직

- **Co-location**: 각 단위는 자신의 소스, 테스트, 타입, (해당하는 경우) 스타일을 포함하는 폴더에 위치. 패턴:
  ```
  components/kpi-card/
    kpi-card.tsx
    kpi-card.test.tsx
    kpi-card.types.ts          // 옵션, 비자명한 경우만
    index.ts                   // 단일 named re-export
  ```
- **파일 크기 한도: 파일당 ≤ 150 논리 라인** (빈 줄, 순수 코멘트 줄, import-only 줄 제외). CI의 `scripts/check-file-size.ts`로 강제.
- **함수 크기**: ≤ 30 라인 목표, 단일 목적. 50 라인을 넘는 함수는 Biome의 `noExcessiveCognitiveComplexity` 규칙으로 실패.
- **단일 책임 원칙(Single Responsibility)**: 파일당 하나의 개념. 한 파일이 두 가지 무관한 이유로 변경된다면 분리하라.
- **순수 함수 우선(Pure first)**: 비즈니스 로직은 순수. 부수효과(fetch, fs, BQ, GitHub)는 작은 인터페이스 모듈 뒤에 래핑되어 주입되며, 로직 코드에서 직접 호출되지 않는다. 이것이 90% 커버리지 목표를 달성 가능하게 만드는 핵심.
- **잡탕 파일 금지**: `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts`는 금지. 파일은 실제 하는 일로 명명하라.

### 14.5 네이밍

- 파일 & 폴더: 모든 곳에서 `kebab-case`. 예외는 React 컴포넌트로 `PascalCase.tsx`.
- 익스포트: 값은 `camelCase`, 타입/컴포넌트/클래스는 `PascalCase`, 컴파일타임 상수는 `SCREAMING_SNAKE_CASE`.
- **Named export 전용.** Default export는 다음에서만 허용:
  - Astro 페이지 (`src/pages/*.astro`) — Astro가 요구함.
  - `index.ts` re-export — 원본 정의가 아닌 경우만.
- 테스트 파일: `<unit>.test.ts(x)`로 co-located.

### 14.6 린팅 & 포매팅 — Biome v2

- [**Biome v2**](https://biomejs.dev/blog/biome-v2/) (코드네임 Biotype)가 린트와 포매팅 모두를 위한 **단일 도구**. ESLint와 Prettier는 사용하지 않음.
- 설정: 레포 루트의 `biome.jsonc`; 꼭 필요한 경우만 패키지별 nested 오버라이드.
- §14.3에 나열된 규칙들에 대한 strict 오버라이드와 함께 추천 프리셋 활성화.
- Type-aware 규칙 활성화; Biome v2는 lint pass에서 TypeScript 컴파일러를 요구하지 않고 이를 수행.
- **CI**: `bunx biome ci .` — lint **와** format check 실행; 어떤 편차든 빌드 실패.
- **로컬 pre-commit** (선택, `simple-git-hooks` 통해): `bunx biome check --write --staged`.

### 14.7 데드 코드 검출 — Knip

- [**Knip**](https://knip.dev/)이 CI에서 사용되지 않는 파일, 익스포트, 타입, dependencies, devDependencies, binaries 검출.
- 설정: 레포 루트의 `knip.json`; `pipeline/`과 `web/`을 위한 별도 워크스페이스 엔트리.
- **CI**: `bunx knip --no-progress --reporter compact` — 어떤 발견이든 빌드 실패.
- 발견된 항목은 삭제하거나, 해당 파일에 `// knip-ignore: <이유>` 코멘트 또는 `knip.json` 엔트리로 명시적으로 ignore 리스트에 추가해야 함.

### 14.8 테스트 — Vitest, 커버리지 ≥ 90%

- **Vitest** (Astro를 구동하는 같은 Vite 사용 — 새 toolchain 없음).
- 테스트는 **co-located** (`foo.test.ts`가 `foo.ts` 옆에); 별도 `__tests__` 폴더 사용 안 함.
- **커버리지 임계치: ≥ 90%** lines, branches, statements, functions — **파일별로** 적용 (전역 뿐 아니라), 따라서 어떤 단일 파일도 나머지를 끌어내릴 수 없다.
- Provider: `@vitest/coverage-v8`.
- `vitest.config.ts` 스니펫:
  ```ts
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      include: ["**/*.test.ts", "**/*.test.tsx"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        thresholds: { lines: 90, branches: 90, functions: 90, statements: 90, perFile: true },
        exclude: ["**/*.test.*", "**/*.config.*", "**/index.ts", "scripts/**", "**/*.astro"],
      },
    },
  });
  ```
- **테스트 카테고리**:
  - **Unit** — `pipeline/src/**`와 `web/src/lib/**`의 순수 함수.
  - **Integration** — stub된 BQ / GitHub / DuckDB 클라이언트와 함께 연결된 파이프라인 모듈.
  - **Component** — `vitest --browser.enabled` (Playwright provider)에서 실행되는 `@testing-library/react`로 React islands.
- **CI**: `bunx vitest run --coverage`; 실행과 임계치 체크 모두 통과해야 함.
- **테스트 이름**은 구현이 아닌 동작을 설명: `it("returns +∞ when previous period is zero and current is positive", ...)`.

### 14.9 CI 품질 게이트 (`/.github/workflows/ci.yml`)

모든 PR과 `main`으로의 푸시에서 단일 워크플로우. 작업은 병렬로 실행; 총 wall-clock 목표 ≤ 3분.

| #  | 단계              | 명령                                                  | 머지 차단 |
| -- | ----------------- | ----------------------------------------------------- | --------- |
| 1  | 타입 체크         | `bunx tsgo --noEmit --checkers 2`                     | 예        |
| 2  | Lint + format     | `bunx biome ci .`                                     | 예        |
| 3  | 데드 코드         | `bunx knip --no-progress --reporter compact`          | 예        |
| 4  | 파일 크기         | `bun run scripts/check-file-size.ts`                  | 예        |
| 5  | 테스트 + 커버리지 | `bunx vitest run --coverage`                          | 예        |
| 6  | 웹 빌드           | `bun run build` (`/web`에서)                          | 예        |
| 7  | Lighthouse CI     | (§9.4 예산 보존)                                       | 예        |

이들 중 **어느 하나의** 실패도 머지를 차단한다. 파이프라인 워크플로우(`daily.yml`)는 이 게이트들을 inline으로 실행하지 않음 (`main`에서 이미 통과했음); 데이터 생산 단계만 실행한다.

---

## 15. 저장소 구조

```
hnpulse/
├── .github/
│   └── workflows/
│       ├── daily.yml          # cron 14:00 UTC: pipeline + commit + deploy
│       ├── pr-preview.yml     # PR open: build + wrangler preview deploy
│       └── ci.yml             # PR/main: §14.9 quality gate (parallel jobs)
├── scripts/
│   └── check-file-size.ts     # §14.4 ≤150 논리 라인/파일 강제
├── pipeline/                  # Bun + TypeScript (§14 규약 적용)
│   ├── src/
│   │   ├── bq/                # BigQuery client + query builders (co-located)
│   │   │   ├── client.ts
│   │   │   ├── client.test.ts
│   │   │   └── index.ts
│   │   ├── release/           # GitHub Release asset add/delete
│   │   ├── duckdb/            # DuckDB CLI invocation + SQL templates
│   │   ├── aggregate/         # aggregate.sql + 결과 파서
│   │   ├── validate/          # 10× 규칙 및 기타 게이트
│   │   ├── emit/              # kpis.<sha>.json + meta.json 작성
│   │   ├── domains/           # tldts 래퍼
│   │   ├── schema/            # /web과 공유하는 zod 스키마 (§14.3)
│   │   └── index.ts           # 엔트리 — 일일 실행 오케스트레이션
│   ├── vitest.config.ts
│   ├── package.json
│   └── tsconfig.json
├── web/                       # Astro project (created via shadcn preset)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.astro    # the dashboard
│   │   │   └── about.astro    # methodology
│   │   ├── components/        # React islands, 테스트 + 타입과 co-located
│   │   │   ├── kpi-card/
│   │   │   ├── range-selector/
│   │   │   └── ...
│   │   ├── styles/            # tailwind + theme tokens
│   │   └── lib/               # data loaders, range filters, formatters (각각 co-located)
│   ├── public/
│   │   ├── data/              # generated by pipeline; committed
│   │   │   ├── kpis.<sha>.json
│   │   │   └── meta.json
│   │   ├── og.png             # 1200×630 social card
│   │   └── favicon.png        # 512×512 brand mark (HN orange motif)
│   ├── astro.config.mjs
│   ├── components.json        # shadcn config (Base preset)
│   ├── tailwind.config.* / tailwind.css
│   ├── vitest.config.ts
│   └── package.json
├── docs/
│   ├── en/spec.md             # English spec
│   └── ko/spec.md             # this document
├── wrangler.jsonc
├── biome.jsonc                # §14.6 lint + format 설정
├── knip.json                  # §14.7 데드 코드 설정
├── tsconfig.base.json         # 공유 strict TS 7 설정 (§14.2)
├── bunfig.toml
├── package.json               # workspace root
├── README.md                  # description, badges, quickstart
├── LICENSE                    # MIT
└── SECURITY.md
```

---

## 16. JSON 스키마

### 16.1 `meta.json`
```jsonc
{
  "schemaVersion": 1,
  "lastUpdated": "2026-05-04T14:03:14Z",   // pipeline finish time (UTC)
  "dataAsOf": "2026-05-03",                 // most recent UTC day in window
  "windowStart": "2024-05-04",
  "windowEnd": "2026-05-03",
  "kpisFile": "/data/kpis.f4a9c1e.json",    // hashed asset path
  "buildSha": "f4a9c1e...",                 // git SHA of the producing commit
  "pipelineVersion": "1.0.0"
}
```

### 16.2 `kpis.<sha>.json`
```jsonc
{
  "schemaVersion": 1,
  "windowStart": "2024-05-04",
  "windowEnd": "2026-05-03",
  "days": ["2024-05-04", "2024-05-05", "...", "2026-05-03"],   // 730 strings
  "metrics": {
    "stories":            [123, 130, 119, ...],
    "comments":           [987, 1004, 950, ...],
    "activeCommenters":   [410, 433, 401, ...],
    "activeSubmitters":   [105, 112, 99, ...],
    "medianScore":        [11, 12, 10, ...],
    "p90Score":           [78, 82, 75, ...],
    "commentsPerStory":   [8.0, 7.7, 8.0, ...],
    "successRateGte100":  [0.043, 0.051, 0.047, ...],
    "showHn":             [12, 15, 11, ...],
    "askHn":              [9, 8, 11, ...],
    "jobs":               [3, 4, 3, ...],
    "deadFlaggedRatio":   [0.012, 0.015, 0.013, ...]
  },
  "topDomainsByDay": [
    {
      "date": "2026-05-03",
      "domains": [
        { "name": "github.com",       "stories": 41, "share": 0.0532 },
        { "name": "nytimes.com",      "stories": 23, "share": 0.0298 },
        ...
      ]                                                          // length = 10
    }
    // one entry per day in window
  ]
}
```

프론트엔드는 이 배열들로부터 즉석에서 범위 집계값(sum / mean / p-quantile)을 계산함.

### 16.3 스키마 버저닝
- 로드 시 `schemaVersion`이 단언됨; 불일치 시 사용자에게 하드 새로고침을 안내하는 "please refresh" 배너 표시.
- 스키마 변경은 파이프라인과 프론트엔드를 함께 변경하는 조정된 커밋이며, 절대 조용히 일어나지 않음.

---

## 17. 일일 워크플로우 (`.github/workflows/daily.yml`)

```yaml
name: daily
on:
  schedule:
    - cron: "0 14 * * *"       # 14:00 UTC daily (~1 h after BQ public dataset refresh)
  workflow_dispatch: {}        # manual trigger / first bootstrap
permissions:
  contents: write              # commit + release manage
jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 60        # bootstrap may need extra headroom
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: opt-nc/setup-duckdb-action@v1
      - name: Install deps
        run: bun install
        working-directory: pipeline
      - name: Run pipeline (freshness-checked, no-op if BQ not yet refreshed)
        env:
          GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: bun run start
        working-directory: pipeline
      - name: Commit data
        run: |
          git config user.name "hnpulse-bot"
          git config user.email "bot@hena.dev"
          git add web/public/data
          git diff --cached --quiet || git commit -m "chore(data): $(date -u +%Y-%m-%d) [skip ci]"
          git push
      - name: Build web
        run: bun install && bun run build
        working-directory: web
      - name: Deploy static assets to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production
```

`pr-preview.yml`과 `ci.yml`은 동일한 형태를 따르되 BQ 쿼리는 건너뛰고 대신 커밋된 JSON을 사용함.

---

## 18. SEO와 소셜

### 18.1 `<head>` 필수 사항
```html
<title>HN Pulse — Hacker News, daily vitals</title>
<meta name="description" content="A daily-updated dashboard of Hacker News' most important community vitals: submissions, comments, active users, top domains, and more.">
<meta property="og:title" content="HN Pulse">
<meta property="og:description" content="Hacker News, daily vitals.">
<meta property="og:image" content="https://hnpulse.hena.dev/og.png">
<meta property="og:url" content="https://hnpulse.hena.dev">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://hnpulse.hena.dev">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/favicon.png">
<link rel="alternate" type="application/json" href="/data/meta.json" title="HN Pulse data feed">
```

### 18.2 `robots.txt`와 `sitemap.xml`
- 둘 다 `/`에서 서빙.
- `robots.txt`는 모든 것을 허용.
- `sitemap.xml`은 `/`와 `/about`을 나열.

### 18.3 웹 분석
- **Cloudflare Web Analytics** 비콘 스니펫(한 줄)을 `<head>`에 주입.
- 쿠키 없음; GDPR 배너 불필요.
- 사이트 태그는 커스텀 도메인이 연결된 후 Cloudflare 대시보드에서 획득.

---

## 19. About 페이지 콘텐츠 (개요)

1. **이게 뭔가** — 한 단락.
2. **데이터는 어디서 오나** — `bigquery-public-data.hacker_news.full`로의 링크.
3. **얼마나 신선한가** — 매일 14:00 UTC, BQ 공개 데이터셋의 자체 일일 갱신(~13:00 UTC) 약 1시간 후. 파이프라인은 신선도 체크를 수행해 소스가 준비되지 않았다면 정상 종료하고 다음 cron에서 재시도.
4. **각 KPI의 의미** — §5를 거울처럼 반영하는 표.
5. **무엇이 제외되나** — `deleted` / `dead` 항목.
6. **도메인 추출** — eTLD+1, 예시.
7. **기간 비교** — 공식 설명.
8. **시간 버킷팅** — §4.4의 표.
9. **오픈 데이터** — 최신 `kpis.json`, `meta.json`, `data-snapshot` GitHub 릴리즈로의 직접 링크 (파워 유저용 `text` 포함 풀 Parquet 행).
10. **소스 코드 및 라이선스** — 레포 링크, MIT.
11. **프라이버시** — Cloudflare Web Analytics, 쿠키 없음, PII 없음.
12. **연락처** — `hi@hena.dev`.

---

## 20. 미해결 질문 / 향후 작업 (post-v1)

- 임베딩 가능한 KPI 카드 (메트릭당 단일 iframe).
- "어제의 HN을 숫자로" RSS 피드.
- 과거 비교 ("오늘 vs. 작년 같은 날").
- Astro i18n을 사용한 한국어 (`/ko`) 로컬라이제이션.
- 일 단위 미만 갱신을 위한 선택적 Firebase API 보충 (비용 모델 재검토 필요).
- 보존된 `text` 컬럼을 활용한 토픽/키워드 분석 (Parquet 스냅샷에 이미 포함되어 있어 추가 BQ 스캔 불필요).
- 동일한 Parquet 스냅샷에 대한 DuckDB `fts` 확장을 활용한 댓글 전체 텍스트 검색.

---

## 21. 참고 문헌

- Hacker News BigQuery 데이터셋: https://console.cloud.google.com/marketplace/product/y-combinator/hacker-news
- Hacker News Firebase API: https://github.com/HackerNews/API
- BigQuery 가격 및 무료 한도: https://cloud.google.com/bigquery/pricing
- shadcn (Base 변형): https://ui.shadcn.com/docs/components/base
- shadcn Chart: https://ui.shadcn.com/docs/components/base/chart
- DuckDB: https://duckdb.org/
- Astro: https://docs.astro.build/
- Cloudflare Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Web Analytics: https://developers.cloudflare.com/web-analytics/
- tldts (eTLD+1 추출): https://github.com/remusao/tldts
- Public Suffix List: https://publicsuffix.org/
- TypeScript 7.0 Beta 발표: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/
- typescript-go (tsgo) 레포: https://github.com/microsoft/typescript-go
- Biome v2 (Biotype): https://biomejs.dev/blog/biome-v2/
- Knip (데드 코드): https://knip.dev/
- Vitest: https://vitest.dev/
- zod (경계 검증): https://zod.dev/

---

*명세서 끝 — v1.0, 2026-05-04 작성.*
