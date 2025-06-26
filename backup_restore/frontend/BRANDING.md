# SuitSync Brand Usage Guide

This document outlines the correct usage of SuitSync logo assets throughout the application to ensure consistent and professional branding.

## Logo Assets

All logo files are located in `frontend/public/`:

- **suitsync-logoh.png**: Horizontal logo (full lockup)
- **suitsync-logov.png**: Vertical logo (stacked lockup)
- **suitsync-logow.png**: Wordmark only (text, no icon)
- **suitsynclogo-only.png**: Icon only (symbol)

## Usage Guidelines

| Asset                  | Recommended Use Cases                                      |
|-----------------------|-----------------------------------------------------------|
| suitsync-logoh.png    | Header/navbar, login screen, splash/loading screen         |
| suitsync-logov.png    | Centered branding, splash screens, onboarding, modals      |
| suitsync-logow.png    | Footer, minimal branding, print previews                   |
| suitsynclogo-only.png | Favicon, app icon, buttons, compact spaces, print tags     |

## Placement Best Practices

- **Header/Navbar**: Use `suitsync-logoh.png` at the top left for brand recognition.
- **Login & Splash Screens**: Use `suitsync-logoh.png` centered or top-aligned for a welcoming experience.
- **Footer**: Use `suitsync-logow.png` for a clean, minimal look.
- **Favicon/App Icon**: Use `suitsynclogo-only.png` for browser tabs and device icons.
- **Print/Tags**: Use `suitsynclogo-only.png` or `suitsync-logow.png` for clarity and space efficiency.

## Sizing & Spacing
- Maintain clear space around all logos (at least the height of the icon).
- Do not stretch, distort, or recolor the logos.
- Use high-resolution PNGs for retina displays.

## Dark/Light Mode
- If background contrast is insufficient, consider adding a subtle shadow or white outline.

## File Reference Example (React/Next.js)
```jsx
<img src="/suitsync-logoh.png" alt="SuitSync Logo" />
```

---
For questions or new use cases, consult the design lead or update this guide. 