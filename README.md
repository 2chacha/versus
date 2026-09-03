# Versus Nexus

서로 다른 만화/애니메이션 캐릭터 간의 가상 대결을 **스탯 + 티어 + hax(potency) 상성** 기반으로
시뮬레이션·시각화하는 개인용 웹 앱. 모든 계산은 브라우저에서 클라이언트 사이드로 처리하며
서버·외부 API·인증이 전혀 없다.

## 기술 스택

- React (Vite)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- recharts (레이더 차트)
- Google Fonts (Orbitron / Noto Sans KR)

## 로컬 실행

> **선행 조건: Node.js (18+ 권장).**

```bash
npm install
npm run dev
```

`npm run dev` 후 표시되는 주소(기본 http://localhost:5173)를 브라우저에서 연다.

## 화면 (탭)

- **⚔️ VS 아레나** — 두 캐릭터 선택 → 레이더 비교 + 승률 + 판정 리포트 (격투게임풍 카드 연출)
- **🗺️ 상성 맵** — 전체 캐릭터 N×N 승률 히트맵 매트릭스 (셀 클릭 상세, 헤더 포커스, 평균 승률 정렬)
- **🧬 편집** — 캐릭터 추가/편집 + 매치업 오버라이드 (localStorage 저장)

## 판정 엔진 요약 (`src/lib/battleEngine.js`)

- **파워 스코어** = 스탯 가중합(power×1.2, speed×1.0, durability×1.0, regeneration×0.8, battleIQ×0.6) + 티어 가산점
- **hax 순보정** = 특성별 **potency**(10/15/20, 폴백 15) 양방향 차이, 저항 시 potency의 30%만 인정, `clamp(±30)`
- **승률** = 로지스틱 변환(`scaleFactor = 25`) 후 순보정 가산, `clamp(5, 95)`
- 리포트 텍스트의 순보정치는 실제 `netModifier`(승자 기준)를 그대로 쓰므로 텍스트와 계산이 항상 일치

## 데이터 관리

- 기본 로스터는 `src/data/characters.json`. 앱은 이 데이터를 시드로 쓰고, 편집/오버라이드는 localStorage 에 저장.
- `src/context/RosterContext.jsx` 의 `DATA_VERSION` 을 올리면 저장본이 새 base 데이터로 새로고침됨(커스텀/오버라이드는 유지).

## GitHub Pages 배포

`.github/workflows/deploy.yml` 이 이미 포함돼 있어 **`main` 브랜치에 push 하면 자동 빌드·배포**된다.

1. GitHub에서 새 리포지토리 생성 (예: `versus-nexus`).
2. 로컬에서 remote 연결 후 push (아래 명령 참고).
3. 리포지토리 **Settings → Pages → Build and deployment → Source 를 "GitHub Actions"** 로 설정.
4. push 시마다 Actions 가 실행되어 `https://<username>.github.io/<repo>/` 로 배포된다.

```bash
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

> 하위 경로(`/<repo>/`) 배포를 위해 워크플로가 빌드 시 `VITE_BASE=/<repo>/` 를 주입하고,
> 아바타 이미지 경로는 `assetUrl()`(BASE_URL 접두)로 보정되므로 프로젝트 사이트에서도 이미지가 깨지지 않는다.
> 사용자/조직 페이지(`<username>.github.io` 리포)에 올릴 경우 base 가 `/` 라 그대로 동작한다.
