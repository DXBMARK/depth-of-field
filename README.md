# Depth of Field Simulator

An interactive optical-planning tool for understanding how aperture, focal length, subject distance, and sensor format affect depth of field. The simulator combines a visual camera scene with live focus-limit calculations, making it useful for photography students, educators, and working photographers.

**Live application:** [depth-of-field-mu.vercel.app](https://depth-of-field-mu.vercel.app/)

## Capabilities

- Adjust aperture, focal length, and camera-to-subject distance with accessible keyboard-friendly sliders.
- Compare near focus, far focus, total depth of field, and hyperfocal distance in real time.
- Select common sensor formats or enter custom sensor dimensions.
- Explore practical camera presets for webcams, phones, APS-C, full-frame, and medium-format systems.
- Switch between imperial and metric output.
- Inspect the scene visually with an interactive field-of-view diagram.
- Use light or dark mode with motion-safe UI transitions.
- Read contextual guidance explaining how each control changes the image.

## Technology

- React 18 and TypeScript
- Vite 5
- Tailwind CSS 3 with `tailwindcss-animate`
- Base UI Slider for accessible, headless range controls
- Font Awesome and React Icons
- Playwright for responsive-browser checks
- Vercel for deployment

## Local Development

### Prerequisites

- Node.js 18.18 or later
- npm 9 or later

### Install and run

```bash
git clone https://github.com/DXBMARK/depth-of-field.git
cd depth-of-field
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Quality Checks

Run these before submitting a change:

```bash
npm test
npm run lint
npm run build
```

The test suite includes a responsive browser assertion for mobile select controls. When Playwright-managed Chromium is unavailable on macOS, the test uses an installed Google Chrome executable as a local fallback.

## Deployment

The `main` branch is connected to Vercel. Pushing a validated change to `main` triggers a production deployment at [depth-of-field-mu.vercel.app](https://depth-of-field-mu.vercel.app/).

The Vite base path is configured to use `/` during Vercel builds and `/depth-of-field/` otherwise, preserving compatibility with project-subpath hosting.

## Contributing

1. Create a focused branch from `main`.
2. Make the smallest change that solves the problem.
3. Run the quality checks above.
4. Open a pull request with a concise behavioral summary.

## Credits

Brought to you with ❤️ [DXBMARK](https://www.dxbmark.com).
