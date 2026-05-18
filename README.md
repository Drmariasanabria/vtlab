# VT Lab

VT Lab is a GitHub Pages platform for educational escape rooms, gamified English language learning, classroom experimentation, and research-oriented resources.

The project is a vibe-coding initiative by Dr María Sanabria at Universidad de Cantabria. It is designed to support both teaching practice and research into educational technology, gamification, learner experience, digital pedagogy, and AI-assisted or vibe-coded educational materials.

Deployment URL:

https://drmariasanabria.github.io/vtlab/

## Current escape room

The initial version includes **Phonetics Time Vault**, a time-travel-inspired phonetics escape room for English language learning. It focuses on IPA transcription, voicing, manner of articulation, and phonological awareness.

It also includes **Bridge Command**, a maritime English escape room / tutor focused on bridge communication, mission stations, oral interaction, and professional English.

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

Room-specific files live in:

`/rooms/phonetics-time-vault/`

`/rooms/bridge-command/`

Firebase integration may be added later for cohort tracking, cross-device persistence, and structured research datasets.

## Firebase

The site includes a lightweight Firebase setup for GitHub Pages in:

`/assets/js/firebase.js`

The landing page initializes Firebase Analytics when supported. The escape rooms send final session records to the Firestore collection:

`roomSessions`

Firestore must be enabled in the Firebase console, and security rules must allow the intended classroom write workflow.

## Generic Research Questionnaires

The shared questionnaire flow lives in:

`/assets/js/research-flow.js`

Each escape room now uses the same generic pre-use and post-use questionnaires. The questions focus on experience with educational escape rooms, interactive learning resources, AI-assisted/vibe-coded resources, usability, engagement, motivation, and perceived value. They are intentionally not specific to a particular subject area.

Questionnaire reports can be exported from each room as PDF or Word-compatible files for:

- Pre-use questionnaire
- Post-use questionnaire
- Combined pre/post report
