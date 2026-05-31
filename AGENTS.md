# Project Agent Rules

## Frontend Design Direction

Use **Combo 6: Scrapbook Landing + Clean Exam** as the default visual direction for this project.

When applying `design-taste-frontend` or any frontend design work:

- Read this project as: a Vietnamese Korean-learning web app for self-study and exam practice, with a playful study-note landing language and a focused exam interface.
- Landing, home, course overview, and learning-entry pages use **Scrapbook Landing**.
- Practice, mock exam, question review, answer explanation, and timed-test pages use **Clean Exam**.
- Do not use the other five test UI combos as the product direction unless explicitly requested.

### Taste Skill Dials

For landing/home surfaces:

- `DESIGN_VARIANCE: 7`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 4`

For app/exam/study surfaces:

- `DESIGN_VARIANCE: 2`
- `MOTION_INTENSITY: 1`
- `VISUAL_DENSITY: 7`

### Visual System

- Brand primary: `#2F5D50`
- Accent yellow: `#F6D365`
- Accent red: `#E88771`
- Background landing: `#FFF8EE`
- Exam surface: `#FFFFFF`
- Text primary: `#262422`
- Border: `#D9CBB8` for scrapbook pages, `#D6D3CD` for exam pages
- Success: `#2F5D50`
- Error: `#B91C1C`
- Warning: `#D99A00`

### UI Rules

- Landing can use limited note-paper, tape, and scrapbook-like shapes.
- Exam and practice pages must remove decoration and prioritize readability.
- Keep one theme per page. Do not mix dark sections into this light system.
- Keep corners consistent: cards `12px-16px`, buttons `10px-12px`, exam controls `8px-10px`.
- Use clear Korean typography with `Noto Sans KR` fallback.
- Do not use purple/blue AI gradients.
- Do not add decorative blobs, bokeh, or random glassmorphism.
- Avoid emoji in app UI.
- Use actual icons from an icon library if the app has one; do not hand-roll SVG icons.

### Component Direction

- Landing CTA: dark green filled button, white text.
- Secondary CTA: white or landing background with border.
- Exam submit button: dark green or navy-like dark brand color, high contrast.
- Question card: white paper surface, thin border, generous padding.
- Answer choices: simple bordered rows, selected state uses soft green background.
- Timer: compact bordered pill or small header block.
- Question navigation: square or lightly rounded boxes, high density, no scrapbook decoration.

