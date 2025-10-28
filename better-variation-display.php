<?php
/**
 * Plugin Name: WPWM Theme Variation Display
 * Plugin URI: https://wp-website-mastery.com/plugins/wpwm-theme-variation-display
 * Description: Admin-only panel in the Site Editor that previews Style Variations with variable-based color swatches and font samples, and lets you select a variation.
 * Version: 0.1.0
 * Requires at least: 6.7
 * Tested up to: 6.8.3
 * Requires PHP: 8.0
 * Author: WP Website Mastery
 * Author URI: https://wp-website-mastery.com/
 * License: GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: wpwm-theme-variation-display
 * Domain Path: /languages
 *
 * @package WPWM_Theme_Variation_Display
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// Base paths
define( 'WPWM_TVD_DIR', plugin_dir_path( __FILE__ ) );
define( 'WPWM_TVD_URL', plugin_dir_url( __FILE__ ) );

// Admin page under Appearance
add_action( 'admin_menu', function () {
    add_theme_page(
        'Theme Variation Display',
        'Theme Variation Display',
        'edit_theme_options',
        'wpwm-tvd',
        function () {
            echo '<div class="wrap"><h1>Theme Variation Display</h1><div id="wpwm-tvd-root"></div></div>';
        }
    );
} );

// Enqueue for our admin page
add_action( 'admin_enqueue_scripts', function () {
    if ( ! function_exists( 'get_current_screen' ) ) { return; }
    $screen = get_current_screen();
    if ( ! $screen || $screen->id !== 'appearance_page_wpwm-tvd' ) { return; }

    wp_enqueue_style( 'wpwm-tvd', WPWM_TVD_URL . 'assets/app.css', [], filemtime( WPWM_TVD_DIR . 'assets/app.css' ) );
    // Enqueue wp-api to expose wpApiSettings.nonce
    wp_enqueue_script( 'wp-api' );
    wp_enqueue_script( 'wpwm-tvd', WPWM_TVD_URL . 'assets/app.js', [ 'wp-element', 'wp-data', 'wp-core-data', 'wp-api-fetch', 'wp-api' ], filemtime( WPWM_TVD_DIR . 'assets/app.js' ), true );

    $theme = wp_get_theme();
    wp_add_inline_script( 'wpwm-tvd', 'window.__WPWM_TVD__ = ' . wp_json_encode( [
        'themeStylesheet' => $theme->get_stylesheet(),
        'pluginRestBase' => rest_url( 'wpwm-tvd/v1' ),
        'pluginUrl'      => WPWM_TVD_URL,
    ] ) . ';', 'before' );
    // Ensure apiFetch uses nonce in Site Editor
    wp_add_inline_script( 'wpwm-tvd', 'if(window.wp && wp.apiFetch && wp.apiFetch.createNonceMiddleware){ try { wp.apiFetch.use( wp.apiFetch.createNonceMiddleware( (window.wpApiSettings && wpApiSettings.nonce) || "" ) ); } catch(e){} }', 'before' );
    // Ensure apiFetch uses nonce in this admin screen
    wp_add_inline_script( 'wpwm-tvd', 'if(window.wp && wp.apiFetch && wp.apiFetch.createNonceMiddleware){ try { wp.apiFetch.use( wp.apiFetch.createNonceMiddleware( (window.wpApiSettings && wpApiSettings.nonce) || "" ) ); } catch(e){} }', 'before' );
} );

// Enqueue only in Site Editor (Appearance → Editor)
add_action( 'enqueue_block_editor_assets', function () {
    if ( ! function_exists( 'get_current_screen' ) ) { return; }
    $screen = get_current_screen();
    if ( ! $screen || $screen->base !== 'site-editor' ) { return; }

    wp_enqueue_style( 'wpwm-tvd', WPWM_TVD_URL . 'assets/app.css', [], filemtime( WPWM_TVD_DIR . 'assets/app.css' ) );
    // Enqueue wp-api to expose wpApiSettings.nonce
    wp_enqueue_script( 'wp-api' );
    wp_enqueue_script( 'wpwm-tvd', WPWM_TVD_URL . 'assets/app.js', [ 'wp-element', 'wp-data', 'wp-core-data', 'wp-api-fetch', 'wp-api' ], filemtime( WPWM_TVD_DIR . 'assets/app.js' ), true );

    $theme = wp_get_theme();
    wp_add_inline_script( 'wpwm-tvd', 'window.__WPWM_TVD__ = ' . wp_json_encode( [
        'themeStylesheet' => $theme->get_stylesheet(),
        'pluginRestBase' => rest_url( 'wpwm-tvd/v1' ),
        'pluginUrl'      => WPWM_TVD_URL,
    ] ) . ';', 'before' );
} );

// REST: aggregate variations from active theme and optional export.json in plugin folder
add_action( 'rest_api_init', function () {
	register_rest_route( 'wpwm-tvd/v1', '/variations', [
		'methods'  => 'GET',
		'permission_callback' => function () { return current_user_can( 'edit_theme_options' ); },
		'callback' => function () {
			$variations = [];

			// Base theme palette from theme.json (used to augment variation palettes)
			$base_palette = [];
			$theme_dir = get_stylesheet_directory();
			$theme_json_path = trailingslashit( $theme_dir ) . 'theme.json';
			if ( file_exists( $theme_json_path ) ) {
				$raw_theme = file_get_contents( $theme_json_path );
				$theme_conf = json_decode( $raw_theme, true );
				if ( is_array( $theme_conf ) ) {
					$bp = $theme_conf['settings']['color']['palette'] ?? [];
					if ( is_array( $bp ) ) {
						$base_palette = $bp;
					}
				}
			}

			// 1) Theme-provided variations in styles/*.json
			$styles_dir = trailingslashit( $theme_dir ) . 'styles/';
			if ( is_dir( $styles_dir ) ) {
				foreach ( glob( $styles_dir . '*.json' ) as $file ) {
					$raw = file_get_contents( $file );
					if ( ! $raw ) { continue; }
					$json = json_decode( $raw, true );
					if ( ! is_array( $json ) ) { continue; }
					$slug  = pathinfo( $file, PATHINFO_FILENAME );
					$title = isset( $json['title'] ) ? $json['title'] : $slug;
					$variations[] = [
						'source' => 'theme',
						'slug'   => $slug,
						'title'  => $title,
						'config' => $json,
						'basePalette' => $base_palette,
					];
				}
			}

			// 2) Optional export file dropped by external app in plugin folder
			$export_file = WPWM_TVD_DIR . 'export.json';
			if ( file_exists( $export_file ) ) {
				$raw = file_get_contents( $export_file );
				$payload = json_decode( $raw, true );
				if ( is_array( $payload ) ) {
					// accept either a single variation object or an array
					$items = isset( $payload[0] ) ? $payload : [ $payload ];
					foreach ( $items as $json ) {
						if ( ! is_array( $json ) ) { continue; }
						$slug  = isset( $json['slug'] ) ? $json['slug'] : ( $json['title'] ?? 'exported' );
						$title = isset( $json['title'] ) ? $json['title'] : $slug;
						$variations[] = [
							'source' => 'export',
							'slug'   => sanitize_title( $slug ),
							'title'  => $title,
							'config' => $json,
							'basePalette' => $base_palette,
						];
					}
				}
			}

			return rest_ensure_response( [ 'variations' => $variations ] );
		}
	] );
} );

// Small notice to host a panel container
add_action( 'admin_footer', function () {
	if ( ! function_exists( 'get_current_screen' ) ) { return; }
	$screen = get_current_screen();
	if ( ! $screen || $screen->base !== 'site-editor' ) { return; }
	echo '<div id="wpwm-tvd-root" style="display:none"></div>';
} );
