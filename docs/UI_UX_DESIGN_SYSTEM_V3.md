# Verity UI/UX Design System v3

Status: Approved direction; foundation tokens landed on `main`. Page-by-page redesign is not yet complete.

## Product design intent

Verity is a thoughtful discussion and trust-context platform. Its interface should feel credible, calm, editorial and operationally capable. The interface must prioritise content, evidence and task completion over decoration.

## Approved visual identity

- Brand direction: Midnight Navy + Trust Teal + Warm Ivory
- Density: Balanced — comfortable reading with useful information visible without excessive whitespace.
- Default theme: Light.
- Motion: restrained, purposeful and disabled/reduced when the user requests reduced motion.

### Core tokens

| Token | Value | Use |
|---|---|---|
| Navy | `#142B3A` | Brand identity, strong navigation, hero surfaces |
| Navy raised | `#1D394A` | Hover and secondary dark surfaces |
| Trust teal | `#168477` | Primary actions and trust-related accents |
| Teal hover | `#116E64` | Primary action hover |
| Warm ivory | `#F5F5F0` | Main application canvas |
| Surface | `#FFFFFF` | Cards, panels and forms |
| Subtle surface | `#F0F2EF` | Secondary surfaces |
| Text | `#1D2B33` | Primary text |
| Muted text | `#687780` | Secondary text and metadata |
| Border | `#E1E7E3` | Dividers, card outlines and inputs |
| Amber | `#D6A45C` | Rare highlights and attention markers |
| Danger | `#B94C4C` | Destructive actions and errors |

Semantic status colours must not be replaced by brand colours: success, warning, danger and neutral states retain distinct meanings. Do not use green to imply a claim is true unless the product has evidence to support that status.

## Layout and density

- Desktop feed: navigation rail, primary content column, contextual right rail.
- Tablet: navigation plus primary column; contextual rail may collapse.
- Mobile: single-column content, compact header, accessible navigation and touch targets.
- Staff/admin: persistent workspace navigation, clear page title, task-oriented content, filters near their results.
- Balanced spacing: 4/8/12/16/24/32 px rhythm; avoid both cramped controls and oversized empty cards.
- Content width should support comfortable reading; long-form evidence and discussions should not span the entire viewport.

## Typography

- Use the existing system sans-serif stack until a bundled font decision is made.
- Page title: 28–36 px, strong weight, tight but readable tracking.
- Section title: 18–22 px, semibold/bold.
- Body: 14–16 px, line-height 1.5–1.7.
- Metadata: 12–13 px; never use low contrast to make it visually disappear.
- Use tabular numerals for metrics and timestamps where useful.

## Component standards

1. Buttons: primary, secondary, quiet and destructive variants; clear disabled/loading states.
2. Cards: white surface, subtle border, modest radius and restrained shadow.
3. Forms: consistent label, helper, validation and error treatment.
4. Tables/queues: clear status, priority, owner, date and responsive overflow.
5. Status: semantic labels plus text, not colour alone.
6. Empty/loading/error: informative empty states, skeletons and actionable errors.
7. Navigation: shared active, hover, focus and mobile states.
8. Charts: use only when data exists; label units, time ranges and missing data.
9. Evidence: distinguish user-provided material, automated checks, published fact checks and human decisions.
10. AI: clearly label generated suggestions; never imply an AI suggestion is a verified decision.

## Page families and rollout

### Phase 1 — Foundation
- Design tokens and browser theme colour.
- Shared typography, focus, surface, border and action conventions.
- Audit/remove duplicate legacy CSS only after selectors are mapped.
- Add visual regression/source-level checks.

### Phase 2 — Core community
- Feed, global navigation, search/discovery, profiles, people, communities, questions, notifications, settings and authentication.

### Phase 3 — Trust experience
- Verification, media/claim checks, source/evidence presentation, reports and appeals.

### Phase 4 — Operations
- Customer support, staff support, moderation, admin overview, user/staff management and system health.

### Phase 5 — Intelligence and business
- AI command center, business/partnerships, revenue and analytics.

### Phase 6 — QA
- Desktop/tablet/mobile review, keyboard and screen-reader checks, reduced motion, contrast, loading/error/empty states, regression tests and production build.

## Non-negotiable preservation rules

- Do not remove or weaken existing product functionality to achieve a visual change.
- Do not change authorization, RLS, role boundaries, moderation rules or business logic as part of styling work.
- Inspect each page and its existing interactions before restructuring it.
- Keep user-facing copy and trust labels factually accurate.
- Do not invent analytics, revenue, verification outcomes or AI capabilities.
- Test each page family before moving to the next phase.
- A passing build is not visual QA; do not claim browser-level verification without actually performing it.

## Current implementation status

- [x] Navy/teal/ivory design tokens added to `app/globals.css`.
- [x] Browser theme colour aligned to navy in `app/layout.tsx`.
- [x] Smoke test asserts core tokens and browser theme colour.
- [ ] Consolidate legacy CSS and remove conflicting historical overrides.
- [ ] Shared component primitives and typography pass.
- [ ] Core community page redesign.
- [ ] Trust, operations, and business page redesign.
- [ ] Responsive visual QA across all page families.
