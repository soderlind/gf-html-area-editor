# GF HTML Area Editor

Adds a rich text editor (TinyMCE) to the Gravity Forms HTML field content setting, replacing the default plain textarea.



https://github.com/user-attachments/assets/ee62e2e2-93f9-4591-afa3-cfd35fd17d9e



## Description

By default, Gravity Forms provides a plain textarea for entering content in HTML fields. This plugin enhances that experience by replacing the textarea with the WordPress visual editor (TinyMCE), allowing you to:

- Use a familiar WYSIWYG interface for formatting content
- Easily add bold, italic, lists, and other formatting
- Insert links with the built-in link dialog
- Add images from the WordPress Media Library
- Switch between Visual and Text (HTML) modes

## Requirements

- WordPress 5.0 or higher
- Gravity Forms 2.5 or higher
- PHP 7.4 or higher

## Installation

1. Download [`gf-html-area-editor.zip`](https://github.com/soderlind/gf-html-area-editor/releases/latest/download/gf-html-area-editor.zip)
2. Upload via  `Plugins → Add New → Upload Plugin`
3. Activate via `WordPress Admin → Plugins`

Plugin [updates are handled automatically](https://github.com/soderlind/wordpress-plugin-github-updater#readme) via GitHub. No need to manually download and install updates.

## Usage

1. Navigate to **Forms** → **Edit Form** in your WordPress admin
2. Add or select an HTML field
3. In the field settings, you'll see a rich text editor instead of the plain textarea
4. Use the Visual tab for WYSIWYG editing or the Text tab for raw HTML
5. Content is automatically saved and sanitized when displayed on the frontend

## Security

The plugin sanitizes all HTML field content on the frontend using WordPress's `wp_kses()` function. The following HTML elements are allowed:

- Text formatting: `<p>`, `<br>`, `<strong>`, `<b>`, `<em>`, `<i>`
- Headings: `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Links: `<a>` (with href, title, target, rel attributes)
- Images: `<img>` (with src, alt, title, width, height, class attributes)

## Development

### Running Tests

```bash
# PHP tests
composer install
composer test

# JavaScript tests
npm install
npm run test:js
```

## Credits

Inspiered by the work of [Gravity Wiz- Rich Text HTML Fields](https://gravitywiz.com/snippet-library/gw-rich-text-html-fields/).


## License

GPL-2.0-or-later
