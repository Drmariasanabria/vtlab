# VT Lab

VT Lab is a GitHub Pages platform for educational escape rooms, gamified English language learning, classroom experimentation, and research-oriented resources.

The project is a vibe-coding initiative by Dr María Sanabria at Universidad de Cantabria. It is designed to support both teaching practice and research into educational technology, gamification, learner experience, digital pedagogy, and AI-assisted or vibe-coded educational materials.

Deployment URL:

https://drmariasanabria.github.io/vtlab/

## Current escape room

The initial version includes **Phonetics Whovian Vault**, a time-travel-inspired phonetics escape room for English language learning. It focuses on IPA transcription, voicing, manner of articulation, and phonological awareness.

The public-facing alternative title **Phonetics Time Vault** can be used when a safer generic title is preferred.

## Teaching and research flow

Each escape room is designed to support:

- A splash page before the activity begins.
- A pre-task questionnaire for expectations, attitudes, prior experience, and confidence.
- A consent notice for classroom feedback and anonymised or pseudonymised research-oriented analysis.
- A start button that unlocks the escape room only after the pre-questionnaire is submitted or explicitly skipped.
- A post-task questionnaire after completion or exit.
- Local export options for pre-questionnaire, post-questionnaire, and combined pre/post reports.

## Exports

Questionnaire data are stored locally in `localStorage` for this first version. Reports can be exported immediately as PDF or Word-compatible files:

- Pre-questionnaire PDF
- Pre-questionnaire Word
- Post-questionnaire PDF
- Post-questionnaire Word
- Combined pre/post research report PDF
- Combined pre/post research report Word

The export disclaimer included in reports is:

> Data are intended for classroom feedback and research-oriented analysis in anonymised or pseudonymised form.

## Technical notes

This is a static website built with clean HTML, CSS, and vanilla JavaScript. It is GitHub Pages compatible and does not require a backend, server, npm, Firebase, build step, credit card, or paid service.

Questionnaire definitions live in:

`/research/questionnaires.js`

Export utilities live in:

`/research/export.js`

Room-specific logic lives in:

`/rooms/phonetics-whovian-vault/`

Firebase integration may be added later for cohort tracking, cross-device persistence, and structured research datasets.
