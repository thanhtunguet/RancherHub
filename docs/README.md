# Rancher Hub Documentation

This directory contains the Jekyll-based documentation site for Rancher Hub. The documentation is automatically built and deployed to GitHub Pages when changes are pushed to the main branch.

## Local Development

### Prerequisites

- Ruby >= 3.1
- Bundler gem

### Setup

1. **Install dependencies:**
   ```bash
   cd docs
   bundle install
   ```

2. **Run Jekyll locally:**
   ```bash
   bundle exec jekyll serve
   ```

   The site will be available at http://localhost:4000/RancherHub/

3. **Build for production:**
   ```bash
   bundle exec jekyll build --baseurl /RancherHub
   ```

## Project Structure

```
docs/
├── _config.yml          # Jekyll configuration
├── _data/               # Data files (YAML)
│   ├── benefits.yml
│   └── features.yml
├── _layouts/            # Layout templates
│   ├── default.html
│   ├── home.html
│   ├── page.html
│   └── guide.html
├── assets/              # Static assets
│   └── css/
│       └── main.css
├── index.md             # Home page
├── getting-started.md    # Getting started guide
├── features.md          # Features documentation
├── api.md               # API documentation
└── Gemfile              # Ruby dependencies
```

## Adding New Pages

1. Create a new Markdown file in the `docs/` directory
2. Add front matter with layout and metadata:
   ```yaml
   ---
   layout: page
   title: Your Page Title
   description: Page description
   ---
   ```
3. Write your content in Markdown
4. Add the page to navigation in `_config.yml` if needed

## Styling

The documentation site uses:
- **Tailwind CSS** (via CDN) for utility classes
- **Custom CSS** in `assets/css/main.css` for prose styling
- **Design System** matching the frontend landing page:
  - Poppins font for headings
  - Open Sans font for body text
  - Blue-600 primary color (#2563EB)
  - Orange-500/600 for CTAs
  - Gradient backgrounds (slate-50 to blue-50)

## Deployment

The documentation is automatically deployed to GitHub Pages via GitHub Actions when:
- Changes are pushed to the `main` branch in the `docs/` directory
- The workflow is manually triggered

The workflow file is located at `.github/workflows/jekyll-docs.yml`.

## Configuration

Key settings in `_config.yml`:
- `baseurl`: `/RancherHub` (for GitHub Pages)
- `url`: `https://thanhtunguet.github.io`
- Navigation items can be configured in the `navigation` section

## License

Same as the main project (MIT).
