# FINDINGS.md — Review Authenticity Lab

This document records observations, patterns, and signal examples discovered
during development and testing. It grows incrementally as analysis is implemented.

---

## Corpus: Amazon Echo Dot (`B09G9FPHY6`)

### Observation 1 — Sentiment Mismatch
**Review ID:** `rev_b2c3d4e5`  
**Signal:** `SENTIMENT_MISMATCH`  
**Severity:** HIGH  

Body text is strongly negative ("Terrible product. Stopped working after two weeks.
Customer service was no help. Worst speaker I ever bought. Total waste of money.
Avoid at all costs.") paired with a **5-star rating**.

This is a classic pattern in fake review injection: rating values are set
independently of text in automated posting scripts.

---

### Observation 2 — Verbatim Duplicate Text
**Review IDs:** `rev_c3d4e5f6`, `rev_d4e5f6g7`  
**Signal:** `DUPLICATE_REVIEW`  
**Severity:** HIGH  

Two reviews by different authors (`Mike R.`, `Sarah K.`) posted on the exact
same date contain **word-for-word identical text**. Jaccard trigram similarity = 1.0.

Pattern is consistent with a review farm submitting the same template
through multiple accounts.

---

### Observation 3 — Temporal Burst
**Affected Reviews:** `rev_b2c3d4e5`, `rev_c3d4e5f6`, `rev_d4e5f6g7` + 2 others  
**Signal:** `BURST_ACTIVITY`  
**Date:** July 2, 2024  

Five 5-star reviews were posted on the same calendar day. For a product with
~9 total reviews this represents a z-score of approximately **+3.1σ** above the
mean daily review velocity — well above the detection threshold.

---

### Observation 4 — Duplicate Reviewer
**Author:** `John S.`  
**Review IDs:** `rev_a1b2c3d4` (5★), `rev_g7h8i9j0` (2★)  
**Signal:** `REVIEWER_PATTERN`  
**Severity:** HIGH  

The same author left two separate reviews for the same product on different
dates. The second review updates the first (rating dropped from 5★ to 2★).
While not necessarily fraudulent (a user CAN leave multiple reviews), the
pattern is flagged for manual review.

---

## Corpus: Google Play — Spotify (`com.spotify.music`)

### Observation 5 — Cross-Platform Duplication
**Review IDs:** `rev_p1q2r3s4`, `rev_q2r3s4t5`  
**Signal:** `DUPLICATE_REVIEW`  
**Severity:** HIGH  

Two reviews by different users (`Alex M.`, `Chris B.`) share verbatim identical
text posted on the same day. Identical to Observation 2 — a shared review farm
template was likely used across platforms.

---

### Observation 6 — Google Play Sentiment Mismatch
**Review ID:** `rev_r3s4t5u6`  
**Signal:** `SENTIMENT_MISMATCH`  
**Severity:** HIGH  

"The app crashes constantly..." (strongly negative) rated 5 stars.
Same pattern as Observation 1.

---

## General Patterns Identified

| Pattern | Frequency in Corpus | Severity |
|---------|---------------------|----------|
| Sentiment mismatch | 3 of 15 reviews | HIGH |
| Verbatim duplicate | 2 pairs | HIGH |
| Same-day burst | 1 cluster (5 reviews) | HIGH |
| Duplicate reviewer | 1 instance | MEDIUM |

---

## Notes for Phase 2

- Jaccard threshold of **0.85** correctly flags all verbatim duplicates in corpus.
- Threshold of **0.70** would additionally catch paraphrased variants (to be validated).
- Sentiment model selection: `Xenova/distilbert-base-uncased-finetuned-sst-2-english`
  is a good candidate — 67MB, runs on-device, SST-2 binary labels.
- Burst detection needs at least 10 dated reviews to be statistically meaningful.
  Products with <10 total reviews will show a "Insufficient data" notice.
