=== GF HTML Area Editor ===
Contributors: PerS
Tags: gravity forms, html field, rich text editor, wysiwyg, tinymce
Requires at least: 6.5
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adds a rich text editor to the Gravity Forms HTML field content setting.

== Description ==

By default, Gravity Forms provides a plain textarea for entering content in HTML fields. This plugin enhances that experience by replacing the textarea with the WordPress visual editor (TinyMCE), allowing you to:

* Use a familiar WYSIWYG interface for formatting content
* Easily add bold, italic, lists, and other formatting
* Insert links with the built-in link dialog
* Add images from the WordPress Media Library
* Switch between Visual and Text (HTML) modes

= Requirements =

* WordPress 5.0 or higher
* Gravity Forms 2.5 or higher
* PHP 7.4 or higher

== Installation ==

1. Upload the `gf-html-area-editor` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Edit any Gravity Forms form and select an HTML field to see the rich text editor

== Frequently Asked Questions ==

= Does this plugin require Gravity Forms? =

Yes, this plugin is an add-on for Gravity Forms and requires Gravity Forms to be installed and activated.

= What HTML elements are allowed in the output? =

For security, the plugin sanitizes HTML field content on the frontend. Allowed elements include:

* Text formatting: p, br, strong, b, em, i
* Headings: h2, h3, h4, h5, h6
* Lists: ul, ol, li
* Links: a (with href, title, target, rel attributes)
* Images: img (with src, alt, title, width, height, class attributes)

= Can I use merge tags with the rich text editor? =

Yes, merge tags work the same way as with the default HTML field. You can insert merge tags using the merge tag selector.

= Does this work with conditional logic? =

Yes, all existing Gravity Forms functionality including conditional logic continues to work as expected.

== Screenshots ==

1. Rich text editor in the HTML field settings

== Changelog ==

= 1.0.1 =
* Fixed GitHub Plugin Updater not detecting updates (was using wrong factory method)

= 1.0.0 =
* First stable release
* Added GitHub Plugin Updater for automatic updates
* Added `gfte_sanitize_html_content` filter for customizable sanitization
* HTML sanitization now uses wp_kses_post() for broader tag support
* Merge tag dropdown now uses Gravity Forms' built-in merge tag system
* Form field merge tags dynamically included based on current form
* Improved i18n support with translatable strings

= 0.2.3 =
* Fix naming in composer.json for better discoverability

= 0.2.2 =
* Added heading format dropdown (P, H2-H6) in editor toolbar
* Added Media Library button for inserting images
* Compact format dropdown with shorter labels

= 0.2.1 =
* Fixed duplicate preview containers showing "No content" alongside actual content
* Preview now properly replaces Gravity Forms default container

= 0.2.0 =
* Live preview of HTML content in form editor
* Preview updates in real-time as you type
* All HTML fields show rendered content on form load
* Fixed event race conditions and duplicate bindings
* Improved debouncing for preview updates
* Added namespaced jQuery events to prevent conflicts

= 0.1.0 =
* Initial release
* Rich text editor for HTML field content
* Visual and Text mode switching
* Media Library integration
* Content sanitization on frontend output

== Upgrade Notice ==

= 1.0.0 =
First stable release with GitHub auto-updates, improved merge tag integration, and customizable HTML sanitization.

= 0.2.3 =
Metadata improvements for better package discoverability.

= 0.2.2 =
Adds heading format dropdown and media insertion button.

= 0.2.1 =
Fixes duplicate preview containers issue.

= 0.2.0 =
Adds live preview of HTML field content in the form editor.

= 0.1.0 =
Initial release.
