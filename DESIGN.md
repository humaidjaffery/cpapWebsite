---
name: DreamSeal
product:
  name: DreamSeal
  projectName: CpapWebsite
  audience: CPAP patients who are not satisfied with their mask
  primaryPromise: You deserve a CPAP mask that's actually made for you.
  sourceOfTruth:
    readme: README.md
    appScreens:
      - src/app/hero/hero.html
      - src/app/survey/survey.html
      - src/app/thank-you/thank-you.html
    designTokens:
      - src/styles.css
      - src/app/hero/hero.css
      - src/app/thank-you/thank-you.css
    backendTerminology:
      - functions/src/survey.ts
      - functions/src/openai.ts
      - functions/src/index.ts
colors:
  purple: "#8b5cf6"
  gold: "#f59e0b"
  orange: "#fb923c"
  primary: "#6a0dad"
  secondary: "#e6c46a"
  accent: "#c6a646"
  foreground: "#1a1a1a"
  darkGray: "#1f2937"
  mediumGray: "#6b7280"
  lightGray: "#9ca3af"
  muted: "#f6f6f7"
  mutedForeground: "#8a8a8a"
  white: "#ffffff"
  offWhite: "#fafafa"
  border: "#00000014"
  success: "#dff5e1"
  successForeground: "#1a6a2a"
  warning: "#fff4e5"
  warningForeground: "#8a6300"
  destructive: "#ff4d4f"
gradients:
  primary: "linear-gradient(135deg, #8b5cf6 0%, #f59e0b 100%)"
  purpleGold: "linear-gradient(135deg, #8b5cf6 0%, #f59e0b 100%)"
  headline: "linear-gradient(120deg, #6a0dad, #e6c46a)"
  cardBg: "linear-gradient(180deg, rgba(255, 235, 220, 0.25) 0%, rgba(255, 255, 255, 1) 100%)"
  contactBg: "linear-gradient(180deg, rgba(255, 240, 225, 0.5) 0%, rgba(255, 248, 240, 0.7) 100%)"
typography:
  family: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
  display:
    fontSize: 56px
    lineHeight: 1.1
    fontWeight: 700
    letterSpacing: "-0.04em"
  displayAccent:
    fontSize: 64px
    lineHeight: 1.1
    fontWeight: 700
    letterSpacing: "-0.04em"
  sectionHeading:
    fontSize: 36px
    lineHeight: 1.2
    fontWeight: 700
  body:
    fontSize: 16px
    lineHeight: 1.6
    fontWeight: 400
  small:
    fontSize: 13px
    lineHeight: 1.5
rounded:
  sm: 4px
  mdCompact: 6px
  button: 6px
  lgCompact: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
shadows:
  subtle: "0 2px 8px rgba(0, 0, 0, 0.04)"
  card: "0 4px 20px rgba(0, 0, 0, 0.06)"
  input: "0 2px 12px rgba(0, 0, 0, 0.08)"
  elevatedCard: "0 22px 45px rgba(0, 0, 0, 0.12)"
components:
  buttons:
    primary:
      background: "linear-gradient(135deg, #6a0dad, #e6c46a)"
      color: "#ffffff"
      borderRadius: 6px
      heightMobile: 55px
    outlineGradient:
      border: "gradient stroke"
      color: "#1a1a1a"
  inputs:
    background: "#ffffff"
    border: "1px solid #000000"
    borderRadius: 6px
    heightDesktop: 52px
    heightMobile: 55px
  cards:
    border: "1px solid #00000014"
    background: "#ffffff"
    gradientStroke: "linear-gradient(135deg, #6a0dad, #e6c46a)"
assets:
  logo: public/dreamseal_logo.png
  appScreens:
    - public/photo1.png
    - public/photo2.png
    - public/photo3.png
  decorative:
    - public/nightsky.jpg
    - public/cloud_png.png
---

# Design System

## Overview

DreamSeal is a modern, luxury-feeling CPAP mask website for patients who are not satisfied with their current mask. The interface should feel calm, precise, and personal: purple signals comfort and sleep, while gold signals luxury and premium customization.

The repo's README currently leads with default Angular CLI setup text, not product positioning. Do not use Angular CLI copy as patient-facing content. The product source of truth is the app itself, especially `src/app/hero/hero.html`, `src/app/survey/survey.html`, and the backend prompt in `functions/src/openai.ts`, which describes DreamSeal as "a custom CPAP mask startup."

## Product Language

Use existing product copy before writing new copy:

- Brand: DreamSeal
- Primary promise: "You deserve a CPAP mask that's actually made for you."
- Supporting promise: "You deserve a custom fit mask"
- Product explanation: "We are creating hyper-personalized masks from a facial scan and survey questions all from the comfort of your iPhone."
- Waitlist CTA: "Join the waitlist"
- Waitlist helper: "Join the waitlist to be the first to receive your ideal mask with a discount"
- Value message: "No more leaks, No more irritation, Reclaim your sleep"
- Personalization line: "You are unique, your mask should be too"
- App section: "Achieve full customizability through our easy app."
- Completion message: "Thank you so much for helping us build the perfect CPAP mask!"
- Completion subtext: "We will be in contact with you shortly"

The native product shape is a personalized mask pipeline:

1. Join the waitlist.
2. Answer research-backed survey questions.
3. Scan your face.
4. Receive your ideal mask and customize.
5. Buy your ideal mask in one click and automatically set up refills.

This flow should organize pages more often than generic marketing sections. When a screen needs hierarchy, lead with the patient's desired outcome first, then explain the survey and scan mechanics.

## Colors

Use purple and gold together as the signature DreamSeal identity. Purple should carry comfort, sleep, and reassurance. Gold should be used as a premium accent for luxury, customization, and important highlights.

- Primary purple `#6a0dad`: main brand color, active states, icon color, gradient start.
- Comfort purple `#8b5cf6`: softer purple used in global gradients and atmospheric background decoration.
- Secondary gold `#e6c46a`: premium accent, gradient end, emphasized words, step numbers.
- Gold `#f59e0b`: warmer CTA gradient endpoint from the global token set.
- Accent `#c6a646`: restrained luxury accent when `#e6c46a` is too bright.
- Foreground `#1a1a1a`: primary text.
- Muted foreground `#8a8a8a`: helper copy and secondary descriptions.
- White `#ffffff`: primary page and card surface.

Avoid making screens feel like a single purple page. Use white space, black text, and gold accents to keep the brand premium and readable.

## Typography

Use Inter throughout. Display copy uses high contrast through weight and gradient fill rather than decorative type.

- Hero headline: 56px, 700 weight, 1.1 line-height, tight tracking from the existing app.
- Hero accent headline: up to 64px in the current template when the core promise needs dominance.
- Section heading: 36px, 700 weight, 1.2 line-height.
- Body text: 15-16px, 1.4-1.6 line-height.
- Helper text: 13-14px, muted foreground, 1.5 line-height.

Do not scale type fluidly with viewport width. Use explicit responsive sizes as the current CSS does.

## Layout

The visual system is spacious, centered, and high-trust. The hero page centers the logo and product promise, then moves into the waitlist form. Below the fold, use the app screenshots and the four-step pipeline as the main organizing structure.

Use full-width page sections and constrained inner content. Cards are appropriate for individual steps, forms, and survey question groups. Avoid nested cards.

Keep the first viewport focused on the product promise and waitlist action. The app screenshots and process steps should follow, since the product depends on survey answers and facial scanning.

## Components

### Buttons

Primary buttons use the purple-to-gold gradient, white text, a consistent 6px radius (`--radius-button`), and restrained shadow. Use this radius for standard action buttons throughout the site; reserve pill radii for chips, tags, and similar controls. Keep labels exact where they already exist, especially "Join the waitlist", "Contact us", and "Submit Answers".

Gradient-outline buttons use the same gradient as a stroke with black foreground text. Use them for secondary actions such as "Contact us".

### Inputs

Inputs are white with black or light-gray borders, compact radius, and 52-55px target height in the waitlist form. Use plain labels and placeholders from the templates. Keep iOS-friendly 16px input text on mobile.

### Survey Controls

Survey choices use segmented button groups for Yes/No, 1-10 scale controls, and source options. Active states use the purple-to-gold gradient or gradient stroke already defined in `thank-you.css`.

Survey terminology should match the code fields:

- `usedCpap`
- `cpapDuration`
- `masksUsed`
- `satisfaction`
- `improvements`
- `annualMaskCost`
- `insuranceCoverage`
- `maxOutOfPocket`
- `hearAboutUs`

### Step Cards

Step cards should use subtle radial purple and gold backgrounds, a gradient stroke, a 32px gradient number circle, and Lucide/Iconify icons where already used. The established icons are `clipboard-list`, `scan-face`, `sparkles`, and `shopping-bag`.

### Background Decoration

Use large blurred purple and gold circles and thin gradient lines sparingly. They should create a soft sleep/luxury atmosphere without making text hard to read.

## Imagery

Use the real assets in `public/`:

- `dreamseal_logo.png` for the logo.
- `photo1.png`, `photo2.png`, and `photo3.png` for app screenshots.
- `nightsky.jpg` and `cloud_png.png` only if a screen needs sleep atmosphere.

Do not replace the product screenshots with generic medical or stock imagery. The site is selling a custom CPAP flow, so visuals should show the app, mask customization process, sleep comfort, or DreamSeal brand.

## Content Rules

Do not invent medical claims, product specifications, FDA status, insurance coverage, pricing, or shipping promises. If the repo does not contain it, the UI should not show it.

Use the patient problem language already present in the site: leaks, irritation, satisfaction with current mask, previous masks, comfort preferences, ideal mask, custom designed mask, facial scan, survey questions, refills every 6 months.

When adding new copy is unavoidable, keep it short and route it through existing concepts: custom fit, ideal mask, survey questions, facial scan, comfort, sleep, and follow-up contact.

## Accessibility

Maintain readable contrast for all text. Gradient text should be reserved for large headings and brand names. Body copy, form labels, and survey controls should stay solid foreground text.

Touch targets should stay at least 44px high on mobile. Avoid horizontal scrolling; the current mobile layout stacks waitlist controls, phone screenshots, and step cards.

## Do's And Don'ts

- Do lead with the patient outcome: a CPAP mask made for them.
- Do use gold as a luxury accent, not a full-page color wash.
- Do use purple for comfort, sleep, and primary brand cues.
- Do keep the waitlist and survey pipeline visible as the product's core flow.
- Do use the repo's exact labels and field terminology.
- Don't show claims or features that are not in the repo.
- Don't make Angular CLI or developer setup copy part of the patient-facing brand.
- Don't use generic landing-page filler sections when the app already has a waitlist-to-survey-to-scan pipeline.
