# Relic Arena — 백 라운드 건틀릿

[English README](README.md)

Relic Arena는 오리지널 싱글 플레이 PvE 오토배틀러입니다. 유닛을 구매하고, 기원/직업 시너지를 맞추고, 한정된 유닛 풀과 아이템 조합을 관리하면서 100라운드까지 버티는 게임입니다. Vite, React, TypeScript로 만든 완전 클라이언트 사이드 게임이며, 시드 기반 deterministic RNG와 `localStorage` 저장을 사용합니다.

모든 이름, 유닛, 특성, 아이템, 아이콘, 문구는 오리지널입니다. 외부 IP나 에셋을 사용하지 않았고, 아이콘은 절차적으로 생성한 SVG입니다.

온라인 플레이: https://pinehill99.github.io/relic-arena/

## 개발 과정

Relic Arena는 브라우저 없이도 핵심 규칙을 테스트할 수 있도록 게임 엔진과 React UI를 분리해서 만들었습니다. 구현은 크게 세 층으로 나뉩니다.

- **게임 모델:** 유닛, 특성, 아이템, 몬스터, 경제, 상점, 유닛 풀, 라운드 정의.
- **시뮬레이션 엔진:** 시드 기반 RNG, 자동 전투 tick, 시너지 계산, 아이템 레시피, 별 승급, 100라운드 headless smoke test.
- **플레이 UI:** 8x8 보드, 벤치, 상점, 인벤토리, 인스펙터, 이벤트 로그, 로컬 저장, 원클릭 전투 흐름.

밸런싱 데이터는 반복 가능한 검증으로 관리합니다. 현재 검증 스위트는 유닛 수, 기본 아이템 8개, 1단계 아이템 20개, 2단계 완성 아이템 100개, 상점 확률 합계, 100개 라운드 생성, 100라운드 전투 시뮬레이션을 확인합니다.

## 플레이 영상

아래 영상은 공개 GitHub Pages 빌드에서 실제 플레이한 장면입니다.

<video src="docs/media/relic-arena-gameplay-overview.mp4" controls width="100%" title="Relic Arena gameplay overview"></video>

[플레이 개요 영상 열기](docs/media/relic-arena-gameplay-overview.mp4)

<video src="docs/media/relic-arena-gameplay-combat.mp4" controls width="100%" title="Relic Arena combat and interface"></video>

[전투와 인터페이스 영상 열기](docs/media/relic-arena-gameplay-combat.mp4)

## 1. 실행 방법

```bash
npm install
npm run dev      # http://localhost:5173 에서 게임 실행
```

기타 스크립트:

```bash
npm run build    # 타입 체크 + 프로덕션 빌드
npm run verify   # count assertion + 100라운드 전투 smoke test
npm test         # Vitest 유닛 테스트
```

## 2. 조작과 UI

- **상단 바:** 현재 라운드 / 100, 난이도 배수, 필드 전투력, run seed, **New Run**.
- **중앙:** 8x8 보드. 위 4줄은 적 구역이고, 준비 단계에서는 다음 라운드 적 미리보기를 보여줍니다. 아래 4줄은 내 배치 구역입니다. 보드 아래에는 9칸 벤치가 있습니다.
- **왼쪽 패널:** 활성 시너지와 아이템 인벤토리.
- **오른쪽 패널:** 유닛, 상점 카드, 아이템, 특성, 몬스터를 확인하는 hover 인스펙터와 최근 이벤트 로그.
- **하단 바:** HP, 골드, 레벨, XP 바, **Buy XP**, **Reroll**, 5칸 상점, 보드 수, **Start Combat**.

클릭 기반 조작:

- 상점 카드를 클릭하면 골드와 벤치 공간이 충분할 때 구매합니다.
- 벤치/보드 유닛을 클릭해 선택한 뒤 보드 칸을 클릭하면 배치/이동합니다. 빈 벤치를 클릭하면 벤치로 되돌리고, 점유된 칸을 클릭하면 swap합니다.
- 인벤토리 아이템을 클릭한 뒤 유닛을 클릭하면 장착합니다. 유닛당 최대 3개까지 장착할 수 있고, 레시피가 완성되면 자동 조합됩니다.
- 인벤토리 아이템 하나를 클릭한 뒤 다른 아이템을 클릭하면 인벤토리 안에서 조합합니다.
- 항목 위에 마우스를 올리면 상세 정보를 봅니다. 유닛을 선택하면 인스펙터에 **Sell** 버튼이 나타납니다.
- **Start Combat**을 누르면 해당 라운드 전투가 자동으로 진행됩니다.

## 3. 경제와 XP

- 시작 상태: HP 100, 레벨 3, 골드 8, 상점 5칸.
- **Reroll**은 2골드입니다. **Buy XP**는 4골드로 4XP를 얻습니다. 라운드를 완료할 때마다 +2XP를 자동으로 얻습니다.
- 라운드 수입은 `base(round) + interest + winBonus + bossClearBonus`입니다. base는 라운드 구간에 따라 4/5/6/7, 이자는 `min(5, floor(gold/10))`, 승리 보너스는 +1, 보스 라운드 승리 보너스는 +4입니다.
- 유닛 판매 시 투자 비용의 70%를 돌려받으며 최소 1골드입니다.
- 일반 라운드에서 패배하면 살아남은 적 수만큼 HP를 잃습니다. 10라운드마다 등장하는 보스 라운드에서 패배하면 정확히 10HP를 잃습니다. HP가 0 이하가 되면 패배하고, 100라운드를 클리어하면 승리합니다.

현재 레벨별 필요 XP는 2, 4, 6, 10, 20, 36, 56, 80, 100이며 레벨 10이 최대입니다. 보드 배치 한도는 현재 레벨과 같습니다.

## 4. 유닛 풀과 별 승급

유닛 사본은 비용별 글로벌 풀을 공유합니다.

| 비용 | 유닛당 사본 수 | 고유 유닛 수 |
|---:|---:|---:|
| 1 | 29 | 14 |
| 2 | 22 | 13 |
| 3 | 18 | 12 |
| 4 | 12 | 11 |
| 5 | 10 | 10 |

1성 유닛 3개는 2성으로 자동 합쳐지고, 2성 3개는 3성으로 합쳐집니다. 별 단계별 HP/AD 배율은 1.00x / 1.75x / 2.80x입니다. 유닛을 판매하면 투자한 사본이 풀로 돌아갑니다. 상점 확률은 레벨이 오를수록 고비용 유닛 쪽으로 이동하며, 각 레벨의 확률 합계는 100입니다.

## 5. 특성 — 기원 10개와 직업 10개

시너지는 필드에 배치된 고유 유닛만 계산합니다. 벤치 유닛은 제외됩니다. 활성 임계값에 따라 bronze, silver, gold, prismatic 단계로 표시됩니다.

- **기원** (2/4/6): Ember, Frost, Verdant, Storm, Iron, Void, Celestial, Tidal, Shadow, Arcane.
- **직업** (2/4/6, 일부 8): Vanguard, Duelist, Ranger, Mage, Assassin, Cleric, Engineer, Summoner, Guardian, Warlock.

## 6. 아이템 구조 — 왜 8 / 20 / 100인가

- **기본 부품 8개:** Blade, Rod, Vest, Cloak, Tear, Belt, Bow, Glove. 몬스터에게서는 기본 부품만 드롭됩니다.
- **1단계 아이템 20개:** 자기 자신과의 조합을 포함하면 각 기본 부품은 5개 재료 슬롯에 등장합니다. 따라서 `8 x 5 / 2 = 20`개의 고유 조합이 됩니다.
- **2단계 완성 아이템 100개:** 2단계 레시피는 `base tier-1 + catalyst tier-1` 방향성 조합입니다. 20개 base 각각이 5개 catalyst를 허용하므로 `20 x 5 = 100`개 완성 아이템이 됩니다.

유닛은 최대 3개 아이템을 장착합니다. 부품 장착으로 레시피가 완성되면 자동 조합됩니다.

## 7. 라운드 스케일링

라운드는 수작업 목록이 아니라 절차적으로 생성됩니다. `difficulty = 1.066^(round-1)`, chapter는 `ceil(round/10)`입니다. 일반 적 수는 `clamp(2 + floor(round/5) + floor(round/17), 2, 16)`입니다. 몬스터 HP와 AD는 라운드에 따라 증가하고, 10라운드마다 보스가 등장합니다.

아이템 드롭 스케줄은 평균 풀런 기준 약 110~118개 기본 부품, 운이 좋은 런에서는 약 125~130개 기본 부품을 얻도록 조정되어 있습니다. 이는 100라운드까지 강한 9~10유닛 보드를 완전 무장시키기에 충분하지만 초반을 과도하게 넘치게 하지는 않는 양입니다.

## 8. 필드 전투력

필드 전투력은 전투 결과를 직접 결정하지 않는 읽기 쉬운 요약 점수입니다. 유닛의 HP, AD, SP, 방어력, 마법 저항력, 공격 속도, 비용, 별 보너스, 아이템 배율을 합산하고 활성 특성 임계값에 따른 보정치를 곱합니다.

## 9. 프로덕션 오토배틀러 대비 단순화한 점

- 전투는 100ms tick의 실시간 grid sim이지만 이동은 칸 단위이며 pathing은 greedy-nearest입니다.
- 60개 유닛 전부에 bespoke 스킬 스크립트를 두는 대신 damage burst, heal, shield, summon 같은 archetype 기반으로 처리합니다.
- 기원/직업 효과는 핵심적인 subset을 구현했고, 일부 세부 효과는 근사했습니다.
- PvP, augment, portal, carousel은 없습니다. PvE 전용이며 `localStorage` 한 개 save slot을 사용합니다.
- 보스 phase 스킬은 복잡한 다단계 스크립트 대신 강한 burst와 crowd control로 표현됩니다.

Determinism: run은 seed로 재현할 수 있습니다. 상점 roll과 드롭은 저장된 RNG state를 전진시키고, 각 라운드 몬스터와 전투는 seed와 라운드 번호에서 파생됩니다.
