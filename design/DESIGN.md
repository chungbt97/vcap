# Design System Specification: The Fluid QA Experience

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Intelligent Navigator."** 

We are moving away from the "utility-first" look of typical browser extensions—which often feel like cluttered spreadsheets—and toward a high-end, editorial experience. This system treats Quality Assurance as a premium craft. We break the "template" look by utilizing **intentional asymmetry** (e.g., staggering dashboard cards), **high-contrast typography scales** (using dramatic size differences between display and body text), and **chromatic depth**.

The goal is to feel like a bespoke assistant that lives within the browser, not an intruder upon it. Whether in professional Light Mode, tech-focused Dark Mode, or high-energy Anime Mode, the UI must feel "etched" into the screen rather than floating on top of it.

---

## 2. Colors & Surface Architecture
This system relies on **Tonal Presence** rather than structural scaffolding.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning content. Boundaries must be defined solely through background color shifts or subtle tonal transitions. Use `surface-container-low` against a `surface` background to create a "well" effect for content.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of frosted glass.
- **Level 0 (Base):** `surface` or `surface-dim` (The workspace).
- **Level 1 (Panels):** `surface-container-low` (Secondary info).
- **Level 2 (Cards):** `surface-container` or `surface-container-high` (Primary interaction).
- **Level 3 (Pop-overs):** `surface-container-highest` (Modal/Action triggers).

### The "Glass & Gradient" Rule
To achieve a signature feel, main Action Buttons and Hero elements must use a subtle linear gradient (e.g., `primary` to `primary-container` at a 135° angle). For On-Page Overlays, use **Glassmorphism**: set the surface color to 80% opacity and apply a `backdrop-filter: blur(12px)`.

### Mode-Specific Accents
- **Light Mode:** Focus on `primary` (#2563EB) for trust and precision.
- **Dark Mode:** Use `primary` (#00E5FF) to create a "neon-on-ink" tech aesthetic.
- **Anime Mode:** Lean heavily into `tertiary` (#ff68a8) and `tertiary-container` to drive the "Kawaii" energy, supported by the cat mascot iconography.

---

## 3. Typography
We use a triple-font strategy to create an editorial hierarchy.

*   **Display & Headlines (Space Grotesk):** An authoritative, wide-tracking sans-serif. Use `display-lg` for dashboard empty states and `headline-sm` for section headers.
*   **Titles & Body (Manrope):** A modern, high-legibility typeface. Use `title-md` for card headings and `body-md` for standard QA logs.
*   **Labels (Inter):** A compact, functional typeface for metadata. Use `label-sm` for timestamps and technical status codes.

**The Editorial Shift:** Always keep `letter-spacing: -0.02em` on Space Grotesk and `+0.01em` on Manrope to ensure a premium feel.

---

## 4. Elevation & Depth
We eschew traditional drop shadows for **Ambient Occlusion** and **Tonal Layering**.

*   **Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The human eye will perceive the depth through the color shift alone.
*   **Ambient Shadows:** For floating Browser Action Popups, use a shadow color tinted with the `on-surface` hue at 6% opacity.
    *   *Spec:* `box-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.06);`
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` token at 15% opacity. Never use 100% opaque lines.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `rounded-md` (0.75rem). In Anime Mode, use `rounded-xl` (1.5rem).
- **Secondary:** Surface-container-high fill with `on-surface` text. No border.
- **Interaction:** On hover, increase the gradient intensity or slightly shift the `surface-tint`.

### Input Fields
- **Styling:** Use `surface-container-highest` with a `none` border. 
- **Focus State:** Instead of a thick border, use a 2px `primary` underline or a subtle `surface-tint` glow.
- **Error:** Utilize `error` text with an `error_container` background shift for the entire input field.

### Chips (QA Tags)
- **Status Chips:** Use `secondary_container` for background and `on_secondary_container` for text. 
- **Shape:** Always `rounded-full` (9999px) to contrast against the `rounded-md` cards.

### Cards & Dashboard Lists
- **Rule:** Forbid divider lines. 
- **Spacing:** Separate bug reports and test cases using `1.5rem` (xl) vertical padding.
- **Layout:** In the Dashboard Tab, use an asymmetrical 3-column layout (Left: Navigation/Filters, Center: Large Activity Feed, Right: Stats/Mascot Panel).

### On-Page Overlays (The "HUD")
- **Visuals:** Use the Glassmorphism rule. The overlay should feel like a transparent layer over the user's website. 
- **The Mascot (Anime Mode):** The mascot should "sit" on the edge of the overlay container, partially overlapping the boundary to break the box.

---

## 6. Do's and Don'ts

### Do
- **Do** use whitespace as a separator. If you think you need a line, try adding 8px of padding instead.
- **Do** use `primary-fixed-dim` for inactive states in Dark Mode to maintain "tech" vibrancy without distracting the user.
- **Do** lean into the "Anime Mode" personality. Use playful `tertiary` colors and rounded-xl corners—don't be afraid of the "Kawaii" aesthetic being "too loud."

### Don't
- **Don't** use pure black text on pure white. Use `on-background` (Dark Slate) to reduce eye strain.
- **Don't** use standard "drop shadows" (e.g., #000 at 50% opacity). They feel dated and "heavy."
- **Don't** align everything to a rigid center. Stagger elements or use varied column widths to create visual interest and a custom "editorial" look.