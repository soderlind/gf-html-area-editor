<?php

declare( strict_types=1 );

namespace GFTE\Tests;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;

final class GFTEPluginTest extends TestCase {
	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();
	}

	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	public function test_enqueue_admin_assets_bails_when_not_gravity_forms_page(): void {
		Functions\when( 'current_user_can' )->justReturn( true );
		Functions\when( 'sanitize_key' )->alias( static fn( $v ) => (string) $v );
		Functions\when( 'wp_unslash' )->alias( static fn( $v ) => $v );
		Functions\expect( 'wp_enqueue_script' )->never();
		Functions\expect( 'wp_enqueue_style' )->never();

		$_GET['page'] = 'not_gf_edit_forms';

		\GFTE_Plugin::enqueue_admin_assets( 'toplevel_page_gravityforms' );
		$this->assertTrue( true );
	}

	public function test_enqueue_admin_assets_enqueues_on_gf_edit_forms(): void {
		Functions\when( 'current_user_can' )->justReturn( true );
		Functions\when( 'sanitize_key' )->alias( static fn( $v ) => (string) $v );
		Functions\when( 'wp_unslash' )->alias( static fn( $v ) => $v );
		Functions\when( 'plugins_url' )->alias( static fn( $path ) => 'https://example.test/' . ltrim( (string) $path, '/' ) );

		Functions\expect( 'wp_enqueue_style' )
			->once()
			->with( 'gfte-richtext-html-fields', \Mockery::type( 'string' ), \Mockery::type( 'array' ), \Mockery::type( 'string' ) );
		Functions\expect( 'wp_enqueue_script' )
			->once()
			->with(
				'gfte-richtext-html-fields',
				\Mockery::type( 'string' ),
				\Mockery::type( 'array' ),
				\Mockery::type( 'string' ),
				true
			);

		$_GET['page'] = 'gf_edit_forms';

		\GFTE_Plugin::enqueue_admin_assets( 'admin_page_gf_edit_forms' );
		$this->assertTrue( true );
	}

	public function test_sanitize_html_field_content_allows_basic_tags_and_forces_rel(): void {
		$field = (object) [ 'type' => 'html' ];

		Functions\when( 'wp_kses' )->alias(
			static function ( string $content, array $allowed ): string {
				// Minimal assertion: the allowlist is passed and content is returned.
				TestCase::assertArrayHasKey( 'p', $allowed );
				return $content;
			}
		);

		Functions\when( 'wp_targeted_link_rel' )->alias(
			static fn( string $content ): string => str_replace( '<a ', '<a rel="noopener noreferrer" ', $content )
		);

		$input  = '<p><a href="https://example.test" target="_blank">Link</a><script>alert(1)</script></p>';
		$output = \GFTE_Plugin::sanitize_html_field_content( $input, $field, null, false, 1 );

		$this->assertStringContainsString( '<p>', $output );
		$this->assertStringContainsString( 'rel="noopener noreferrer"', $output );
	}
}
