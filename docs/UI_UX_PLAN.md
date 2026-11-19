# Verity UI/UX plan

## Design objective
Build a calm, credible, enterprise-grade social platform. The interface should make evidence and uncertainty understandable without looking like a generic AI dashboard or a collection of unrelated Tailwind cards.

## Design principles
- One visual language: neutral paper surfaces, deep ink typography, restrained indigo accent, consistent borders and spacing.
- Hierarchy before decoration: clear page title, one primary action, secondary actions visually quieter.
- Content-first feed: readable line lengths, predictable post rhythm, visible author/community context, unobtrusive trust labels.
- Responsive by design: mobile navigation, touch targets, no horizontal overflow, compact cards and forms.
- Accessible by default: keyboard focus, semantic headings, labels, contrast, reduced-motion support, explicit loading/empty/error states.
- Trust without false certainty: AI signals, publisher fact-checks and human decisions must remain visually distinct.

## Delivery phases

### Phase 1 — Feed and global shell
- [x] Establish consistent neutral palette and restrained visual hierarchy.
- [x] Refine desktop feed width, sidebar balance, hero, composer and post cards.
- [x] Reduce decorative effects and shadow noise.
- [ ] Validate mobile layout at narrow phone widths and tablet breakpoints.
- [ ] Review all feed states: loading, empty, error, signed-out, post highlighted, media-heavy.

### Phase 2 — Product surfaces
- [ ] Align profile, people discovery, communities, questions and notifications with the same system.
- [ ] Standardize page headers, primary actions, filters, card spacing and empty states.
- [ ] Improve search discoverability and responsive behavior.

### Phase 3 — Admin and staff workspaces
- [x] Shared enterprise workspace shell and consistent card/input treatment.
- [ ] Audit each admin workflow for information density, table usability, destructive-action clarity and mobile overflow.
- [ ] Make role-specific actions and access boundaries obvious.

### Phase 4 — Quality and accessibility
- [ ] Add visual regression snapshots for desktop/mobile.
- [ ] Check keyboard-only flows, contrast, reduced motion and screen-reader names.
- [ ] Test common viewport sizes and long content.
- [ ] Remove obsolete/conflicting CSS only after confirming no component depends on it.

## Current implementation notes
- The shared shell and workspace tokens exist in `app/globals.css`.
- The latest feed pass is intentionally scoped under `.verity-app`; it avoids rewriting the entire legacy stylesheet in one risky change.
- This is an iterative redesign. Do not call the UI complete until each phase is implemented and verified.
