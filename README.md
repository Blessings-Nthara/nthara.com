# nthara.com

Personal portfolio of Blessings Nthara — https://www.nthara.com

A dependency-free static site (HTML, CSS, vanilla JS) served by GitHub Pages.

## Structure

- `index.html` — all content and SEO metadata (Open Graph, JSON-LD)
- `css/main.css` — design tokens (dark default, light theme), layout and responsive rules
- `js/main.js` — theme toggle, mobile menu, scroll-spy, reveal-on-scroll, hero mesh canvas, copy email
- `img/` — optimised portrait (WebP + JPEG), favicon, social preview image

## Editing content

- **Projects:** copy the commented `work-card` template in the Work section of `index.html`.
- **CV:** add `docs/cv.pdf` and uncomment the "Download CV" button in the hero.
- **Certifications:** add an `.edu` article in the Education section.

## Local preview

```sh
python3 -m http.server 8000
```
