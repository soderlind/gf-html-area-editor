<?php
defined( 'ABSPATH' ) || exit;
/**
 * Plugin Name: GF HTML Area Editor
 * Description: Adds a rich text editor to the Gravity Forms HTML field content setting.
 * Version: 1.0.1
 * Author: Per Soderlind
 * License: GPL-2.0-or-later
 * Text Domain: gf-html-area-editor
 * Domain Path: /languages
 */

// Load the GitHub updater.
require_once __DIR__ . '/GitHubPluginUpdater.php';

use GFTE\Update\GitHubPluginUpdater;

// Initialize GitHub updates with release assets.
GitHubPluginUpdater::create_with_assets(
	'https://github.com/soderlind/gf-html-area-editor',
	__FILE__,
	'gf-html-area-editor',
	'/gf-html-area-editor\.zip/',
	'main'
);

final class GFTE_Plugin {
	private const VERSION             = '1.0.1';
	private const SCRIPT_HANDLE_ADMIN = 'gfte-richtext-html-fields';
	private const STYLE_HANDLE_ADMIN  = 'gfte-richtext-html-fields';

	public static function init(): void {
		add_action( 'plugins_loaded', [ __CLASS__, 'on_plugins_loaded' ] );
	}

	public static function on_plugins_loaded(): void {
		load_plugin_textdomain( 'gf-html-area-editor', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

		add_action( 'admin_init', [ __CLASS__, 'maybe_enqueue_wp_editor' ] );
		add_action( 'admin_enqueue_scripts', [ __CLASS__, 'enqueue_admin_assets' ] );
		add_action( 'gform_field_standard_settings', [ __CLASS__, 'render_rich_content_setting' ], 10, 1 );
		add_filter( 'gform_field_content', [ __CLASS__, 'sanitize_html_field_content' ], 10, 5 );
	}

	public static function maybe_enqueue_wp_editor(): void {
		if ( ! class_exists( 'GFForms' ) ) {
			return;
		}

		// Gravity Forms form editor screen.
		$page = isset( $_GET[ 'page' ] ) ? sanitize_key( (string) wp_unslash( $_GET[ 'page' ] ) ) : '';
		if ( 'gf_edit_forms' !== $page ) {
			return;
		}

		wp_enqueue_editor();
		wp_enqueue_media();
	}

	public static function enqueue_admin_assets( string $hook_suffix ): void {
		if ( ! class_exists( 'GFForms' ) ) {
			return;
		}

		if ( ! current_user_can( 'gravityforms_edit_forms' ) ) {
			return;
		}

		$page = isset( $_GET[ 'page' ] ) ? sanitize_key( (string) wp_unslash( $_GET[ 'page' ] ) ) : '';
		if ( 'gf_edit_forms' !== $page ) {
			return;
		}

		$script_src = plugins_url( 'assets/admin/richtext-html-fields.js', __FILE__ );
		$style_src  = plugins_url( 'assets/admin/richtext-html-fields.css', __FILE__ );

		wp_enqueue_style(
			self::STYLE_HANDLE_ADMIN,
			$style_src,
			[],
			self::VERSION
		);

		wp_enqueue_script(
			self::SCRIPT_HANDLE_ADMIN,
			$script_src,
			[ 'jquery', 'editor', 'media-editor' ],
			self::VERSION,
			true
		);

		wp_localize_script(
			self::SCRIPT_HANDLE_ADMIN,
			'gfteStrings',
			[
				'noContent'      => __( 'No content', 'gf-html-area-editor' ),
				'insertMergeTag' => __( 'Insert Merge Tag', 'gf-html-area-editor' ),
			]
		);
	}

	/**
	 * Render a rich text editor setting in the field settings panel.
	 *
	 * This replaces the plain textarea for HTML field content.
	 */
	public static function render_rich_content_setting( int $position ): void {
		if ( 200 !== $position ) {
			return;
		}
		?>
		<li class="content_setting gfte-rich-content-setting field_setting">
			<label for="field_content" class="section_label">
				<?php esc_html_e( 'Content', 'gravityforms' ); ?>
				<?php if ( function_exists( 'gform_tooltip' ) ) : ?>
					<?php gform_tooltip( 'form_field_content' ); ?>
				<?php endif; ?>
				<span class="gfte-merge-tags-slot"></span>
			</label>
			<div id="gfte-rich-content-setting-wrap">
				<?php
				$editor_id = 'gfte_field_rich_content';
				wp_editor(
					'',
					$editor_id,
					[
						'tinymce'       => true,
						'quicktags'     => true,
						'textarea_name' => $editor_id,
						'editor_height' => 250,
					]
				);
				?>
			</div>
		</li>
		<?php
	}

	/**
	 * Sanitize Gravity Forms HTML field output.
	 *
	 * @param string      $content The field content.
	 * @param object      $field   The field object.
	 * @param string|null $value   The field value.
	 * @param int|bool    $lead_id Lead ID.
	 * @param int         $form_id Form ID.
	 */
	public static function sanitize_html_field_content( $content, $field, $value, $lead_id, $form_id ) {
		if ( ! is_string( $content ) ) {
			return $content;
		}

		if ( ! is_object( $field ) || ! property_exists( $field, 'type' ) || 'html' !== $field->type ) {
			return $content;
		}

		$content = wp_kses_post( $content );

		/**
		 * Filters the sanitized HTML field content.
		 *
		 * @since 0.2.4
		 *
		 * @param string $content The sanitized content.
		 * @param object $field   The Gravity Forms field object.
		 * @param int    $form_id The form ID.
		 */
		$content = apply_filters( 'gfte_sanitize_html_content', $content, $field, $form_id );

		return wp_targeted_link_rel( $content );
	}
}

GFTE_Plugin::init();
