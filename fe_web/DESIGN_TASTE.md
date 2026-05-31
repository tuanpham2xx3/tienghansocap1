# Frontend Design Taste

Default direction: **Combo 6 - Scrapbook Landing + Clean Exam**.

This project should feel like a study-note product at the entry points, then become clean and serious when the user starts practicing or taking an exam.

## Surface Mapping

| Area | Style |
| --- | --- |
| Home / landing | Scrapbook Landing |
| Course list | Scrapbook Landing, restrained |
| Lesson entry | Scrapbook Landing mixed with clean content blocks |
| Lesson detail | Clean study page, light textbook feel |
| Practice quiz | Clean Exam |
| Timed mock exam | Clean Exam |
| Answer review | Clean Exam with explanation panels |
| Progress dashboard | Clean app UI, small scrapbook accents only |

## Landing Mode

Design read: Vietnamese Korean-learning landing page for self-study users, friendly and study-note inspired, leaning toward scrapbook paper composition.

Dials:

- `DESIGN_VARIANCE: 7`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 4`

Tokens:

- Background: `#FFF8EE`
- Primary: `#2F5D50`
- Accent yellow: `#F6D365`
- Accent red: `#E88771`
- Text: `#262422`
- Muted text: `#6B625C`
- Border: `#D9CBB8`
- Surface: `#FFFFFF`

Rules:

- Use one strong hero, left-aligned or asymmetric.
- Use note-card composition sparingly.
- Tape/sticker details are allowed only as small accents.
- Avoid overloaded decoration.
- CTA must be high contrast.

## Clean Exam Mode

Design read: focused Korean exam/practice interface for learners who need readability and speed, leaning toward clean paper exam UI.

Dials:

- `DESIGN_VARIANCE: 2`
- `MOTION_INTENSITY: 1`
- `VISUAL_DENSITY: 7`

Tokens:

- Background: `#F5F4F0`
- Surface: `#FFFFFF`
- Primary: `#2F5D50`
- Text: `#111827`
- Muted text: `#64748B`
- Border: `#D6D3CD`
- Correct: `#15803D`
- Wrong: `#B91C1C`

Rules:

- No tape, sticker, scrapbook illustration, or decorative paper scraps inside exam flow.
- Use large readable question text.
- Use compact question navigation.
- Keep timer visible but not dominant.
- Selected answers use bordered rows with soft background.
- Explanation panels should be direct and scannable.

## Implementation Notes

- Production code should not rely on CDN Tailwind. The `fe_web/test_ui` files are only visual mocks.
- Use `Noto Sans KR` for Korean text.
- If building React/Next later, isolate motion in small client components and keep exam screens mostly static.
- Run a visual check on mobile and desktop before accepting a UI change.

