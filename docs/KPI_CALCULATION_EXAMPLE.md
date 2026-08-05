# KPI calculation example

This example follows the current `production-suite.js` cross-team formula version `v2.1`.

## Input for one member

- Committed tasks: 10
- Closed tasks: 8
- Committed Story Points: 50
- Delivered Story Points: 40
- Criteria KPI score: 8.5/10

## Step 1 — normalized components

```text
completion     = 8 / 10  = 0.80
effort         = 40 / 50 = 0.80
qualityKpi     = 8.5 / 10 = 0.85
predictability = 1 - abs(0.80 - 0.80) = 1.00
```

## Step 2 — absolute raw score

```text
raw = completion × 30%
    + effort × 35%
    + qualityKpi × 25%
    + predictability × 10%

raw = 0.80×0.30 + 0.80×0.35 + 0.85×0.25 + 1.00×0.10
    = 0.8325

rawScore = 0.8325 × 10 = 8.325
```

## Step 3 — relative team index

The system calculates team mean and standard deviation from peer raw scores:

```text
teamIndex = clamp(5 + zScore × 1.5, 0, 10)
```

If team deviation is too small, `teamIndex = rawScore`. Example team index: `7.80`.

## Step 4 — fairness score

```text
fairness = rawScore × 75% + teamIndex × 25%
         = 8.325 × 0.75 + 7.80 × 0.25
         = 8.19375
         ≈ 8.19/10
```

## Criteria score and evidence

Each criterion records achieved/max points and optional Jira keys. The criteria base score, bonus/penalty, grade and coefficient are shown in Đối soát KPI. Every displayed final score should be reproducible from:

1. locked criteria configuration,
2. member score state,
3. selected Jira evidence,
4. formula version/checksum,
5. locked period snapshot.

## Change control

Changing any weight requires updating:

- `production-suite.js`,
- formula tests,
- this example,
- changelog/release notes,
- formula version captured in snapshots.
