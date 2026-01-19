<?php

declare( strict_types=1 );

// Minimal bootstrap for unit tests (no WP loaded).
// Brain Monkey provides function mocking; we define ABSPATH to satisfy plugin guard.

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once __DIR__ . '/../vendor/autoload.php';

// Minimal stubs for functions referenced during plugin load.
if ( ! function_exists( 'add_action' ) ) {
	function add_action() {
		return null;
	}
}

if ( ! function_exists( 'add_filter' ) ) {
	function add_filter() {
		return null;
	}
}

if ( ! function_exists( 'load_plugin_textdomain' ) ) {
	function load_plugin_textdomain() {
		return true;
	}
}

if ( ! function_exists( 'plugin_basename' ) ) {
	function plugin_basename( $file ) {
		return (string) $file;
	}
}

// Ensure GFForms exists for code paths that check it.
if ( ! class_exists( 'GFForms' ) ) {
	class GFForms {}
}

require_once __DIR__ . '/../gf-html-area-editor.php';
