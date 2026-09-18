# Membership plan audit — Baroda Swim Front, February 2026

Audit target: the initialized workspace database. IDs are database-generated and can differ in another deployment; `plan_code` is the stable identifier. All 27 official records are active, uniquely mapped, and match the supplied rate card.

| ID | Category | Schedule / variant | Duration | DB fee | Expected | Registration | Match |
|---:|---|---|---|---:|---:|---:|:---:|
| 7 | Learners | 6 days/week | 1 month | ₹3,500 | ₹3,500 | ₹300 | Yes |
| 8 | Learners | 6 days/week | 3 months | ₹9,500 | ₹9,500 | ₹300 | Yes |
| 9 | Learners | 6 days/week | 6 months | ₹18,500 | ₹18,500 | ₹300 | Yes |
| 10 | Learners | 6 days/week | 9 months | ₹26,500 | ₹26,500 | ₹300 | Yes |
| 11 | Learners | 6 days/week | Annual | ₹33,500 | ₹33,500 | ₹300 | Yes |
| 12 | Learners | 3 days/week | 1 month | ₹3,000 | ₹3,000 | ₹300 | Yes |
| 13 | Learners | 3 days/week | 3 months | ₹8,500 | ₹8,500 | ₹300 | Yes |
| 14 | Learners | 3 days/week | 6 months | ₹16,000 | ₹16,000 | ₹300 | Yes |
| 15 | Learners | 3 days/week | 9 months | ₹22,500 | ₹22,500 | ₹300 | Yes |
| 16 | Learners | 3 days/week | Annual | ₹28,500 | ₹28,500 | ₹300 | Yes |
| 17 | General | 6 days/week | 1 month | ₹3,000 | ₹3,000 | ₹300 | Yes |
| 18 | General | 6 days/week | 3 months | ₹8,500 | ₹8,500 | ₹300 | Yes |
| 19 | General | 6 days/week | 6 months | ₹16,000 | ₹16,000 | ₹300 | Yes |
| 20 | General | 6 days/week | 9 months | ₹22,500 | ₹22,500 | ₹300 | Yes |
| 21 | General | 6 days/week | Annual | ₹28,500 | ₹28,500 | ₹300 | Yes |
| 22 | General | 3 days/week | 1 month | ₹2,700 | ₹2,700 | ₹300 | Yes |
| 23 | General | 3 days/week | 3 months | ₹7,500 | ₹7,500 | ₹300 | Yes |
| 24 | General | 3 days/week | 6 months | ₹14,500 | ₹14,500 | ₹300 | Yes |
| 25 | General | 3 days/week | 9 months | ₹20,500 | ₹20,500 | ₹300 | Yes |
| 26 | General | 3 days/week | Annual | ₹25,500 | ₹25,500 | ₹300 | Yes |
| 27 | Family | 2 adults + 2 kids / 6 days | 1 month | ₹10,000 | ₹10,000 | ₹300 | Yes |
| 28 | Family | 2 adults + 2 kids / 6 days | 3 months | ₹28,500 | ₹28,500 | ₹300 | Yes |
| 29 | Family | 2 adults + 1 kid / 6 days | 1 month | ₹8,000 | ₹8,000 | ₹300 | Yes |
| 30 | Family | 2 adults + 1 kid / 6 days | 3 months | ₹22,500 | ₹22,500 | ₹300 | Yes |
| 31 | Guest | Monday–Friday | 1 hour | ₹300 | ₹300 | ₹0 | Yes |
| 32 | Guest | Saturday–Sunday | 1 hour | ₹350 | ₹350 | ₹0 | Yes |
| 33 | Group | Maximum 50 members | 2 hours | ₹25,000 | ₹25,000 | ₹0 | Yes |

Guest and group records intentionally have no individual one-time registration fee, so their totals remain the published ₹300, ₹350, and ₹25,000. Group is retained in the catalog but blocked from the individual-member registration endpoint because the current schema has no group entity, responsible contact, participant roster, or group-capacity/payment association.

## Legacy records

The workspace database also contains six older active records (IDs 1–6: Quarterly, Monthly, Yearly, General, Learners, Family). They have no stable `plan_code` or hierarchy metadata and their fees do not match this rate card. They were preserved for existing foreign-key references. `GET /api/membership-plans` returns the official catalog when it exists, so these legacy rows cannot appear in the new registration selector. No official plan combination is duplicated or ambiguous.
