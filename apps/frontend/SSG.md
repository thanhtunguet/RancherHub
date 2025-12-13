# Static Site Generation (SSG) Setup

This project uses `vite-react-ssg` to pre-generate static HTML pages for better SEO and initial load performance.

## What is SSG?

Static Site Generation (SSG) pre-renders your React pages at build time, creating fully-formed HTML files that:
- Load faster for users
- Are crawlable by search engines
- Improve SEO rankings
- Reduce server load

## How It Works

The SSG setup automatically pre-renders the landing page and other public-facing routes during the build process.

### Key Components

1. **vite-react-ssg plugin** - Handles the static generation
2. **react-helmet-async** - Manages SEO meta tags
3. **Pre-rendered routes** - Landing page is automatically pre-rendered

## Build Commands

### Standard Build (CSR - Client-Side Rendering)
```bash
npm run build
```
This creates a standard SPA build with client-side rendering.

### SSG Build (Static Site Generation)
```bash
npm run build:ssg
```
This creates pre-rendered HTML files for better SEO.

### Preview

Preview the SSG build locally:
```bash
npm run preview:ssg
```

## SEO Meta Tags

The landing page includes comprehensive SEO meta tags:

- **Primary meta tags** (title, description, keywords)
- **Open Graph tags** (Facebook, LinkedIn)
- **Twitter Card tags**
- **Structured Data (JSON-LD)** for rich search results
- **Canonical URLs**
- **Mobile app meta tags**

## Files Modified

1. **vite.config.ts** - Added ViteReactSSG plugin
2. **main.tsx** - Wrapped app with HelmetProvider
3. **LandingPage.tsx** - Added comprehensive SEO meta tags using Helmet
4. **package.json** - Added build:ssg and preview:ssg scripts

## Recommendations

- Use `npm run build:ssg` for production deployments
- The regular `npm run build` still works for standard SPA builds
- SSG is particularly beneficial for public-facing pages like the landing page
- Authenticated pages (dashboard, etc.) will still work as normal SPA routes

## Testing SEO

After building with SSG, you can:

1. Check the generated HTML in `dist/index.html`
2. Verify meta tags are present in the pre-rendered HTML
3. Test with SEO tools:
   - Google Search Console
   - Lighthouse SEO audit
   - Meta tag validators

## Performance Benefits

With SSG enabled:
- **Faster First Contentful Paint (FCP)**
- **Better SEO rankings**
- **Improved social media sharing** (rich previews)
- **Reduced Time to Interactive (TTI)**

## Notes

- The app continues to work as a normal SPA after the initial load
- All interactive features remain client-side
- SSG only affects the initial HTML delivery
- Authentication and protected routes work normally after hydration
