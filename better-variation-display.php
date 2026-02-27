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

// phpcs:disable Squiz.Commenting.InlineComment.InvalidEndChar

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Base paths
define( 'WPWM_TVD_DIR', plugin_dir_path( __FILE__ ) );
define( 'WPWM_TVD_URL', plugin_dir_url( __FILE__ ) );

/**
 * Determine whether plugin debug logging is enabled.
 *
 * Debug logging can be enabled either by defining `WPWM_TVD_DEBUG` as truthy,
 * or by enabling WordPress debug mode via `WP_DEBUG`.
 *
 * @return bool True if debug logging should be emitted.
 */
function wpwm_tvd_is_debug_enabled() {
	if ( defined( 'WPWM_TVD_DEBUG' ) && constant( 'WPWM_TVD_DEBUG' ) ) {
		return true;
	}

	return defined( 'WP_DEBUG' ) && WP_DEBUG;
}

/**
 * Emit a debug log line when debugging is enabled.
 *
 * This is a thin wrapper around PHP's error_log() intended to centralize
 * debug logging and make it easy to disable in production.
 *
 * @param mixed $message Message (string preferred). Non-strings will be JSON-encoded.
 * @return void
 */
function wpwm_tvd_log_debug( $message ) {
	if ( ! wpwm_tvd_is_debug_enabled() ) {
		return;
	}

	if ( ! is_string( $message ) ) {
		$message = wp_json_encode( $message );
	}

	// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	error_log( $message );
}

/**
 * Read a local file using WordPress' filesystem abstraction.
 *
 * This avoids discouraged direct filesystem calls in environments that require
 * WP_Filesystem credentials or alternative filesystem methods.
 *
 * @param string $path Absolute file path.
 * @return string|false File contents on success, false on failure.
 */
function wpwm_tvd_read_local_file( $path ) {
	if ( ! is_string( $path ) || '' === $path ) {
		return false;
	}

	if ( ! file_exists( $path ) || ! is_readable( $path ) ) {
		return false;
	}

	if ( ! function_exists( 'WP_Filesystem' ) ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
	}

	global $wp_filesystem;
	WP_Filesystem();
	if ( ! $wp_filesystem || ! is_object( $wp_filesystem ) ) {
		return false;
	}

	return $wp_filesystem->get_contents( $path );
}

// Read optional agency branding settings from active theme styles/agency-settings.json.
/**
 * Read optional agency branding settings from the active theme's styles folder.
 *
 * If the file does not exist (or is invalid), returns WPWM defaults.
 *
 * @return array{companyName:string,companyContact:string,companyLogoUrl:string,clientName:string,source:string}
 */
function wpwm_tvd_get_agency_branding() {
	$defaults = array(
		'companyName'    => 'WPWM Theme Variation Display by WP Website Mastery',
		'companyContact' => 'https://wp-website-mastery.com',
		'companyLogoUrl' => '',
		'clientName'     => '',
		'source'         => 'default',
	);

	$theme_dir     = get_stylesheet_directory();
	$styles_dir    = trailingslashit( $theme_dir ) . 'styles/';
	$settings_path = $styles_dir . 'agency-settings.json';
	if ( ! file_exists( $settings_path ) ) {
		return $defaults;
	}

	$raw = wpwm_tvd_read_local_file( $settings_path );
	if ( ! $raw ) {
		return $defaults;
	}
	$cfg = json_decode( $raw, true );
	if ( ! is_array( $cfg ) ) {
		return $defaults;
	}

	$company_name    = isset( $cfg['companyName'] ) && is_string( $cfg['companyName'] ) ? trim( $cfg['companyName'] ) : '';
	$company_contact = isset( $cfg['companyContact'] ) && is_string( $cfg['companyContact'] ) ? trim( $cfg['companyContact'] ) : '';
	$client_name     = isset( $cfg['clientName'] ) && is_string( $cfg['clientName'] ) ? trim( $cfg['clientName'] ) : '';
	$logo_file       = isset( $cfg['companyLogo'] ) && is_string( $cfg['companyLogo'] ) ? trim( $cfg['companyLogo'] ) : '';

	$out           = $defaults;
	$out['source'] = 'theme';
	if ( $company_name ) {
		$out['companyName'] = $company_name;
	}
	if ( $company_contact ) {
		$out['companyContact'] = $company_contact;
	}
	if ( $client_name ) {
		$out['clientName'] = $client_name;
	}

	if ( $logo_file ) {
		$logo_file = wp_basename( $logo_file );
		$logo_path = $styles_dir . $logo_file;
		if ( file_exists( $logo_path ) ) {
			$theme_uri             = get_stylesheet_directory_uri();
			$out['companyLogoUrl'] = trailingslashit( $theme_uri ) . 'styles/' . rawurlencode( $logo_file );
		}
	}

	return $out;
}

// Admin page under Appearance
add_action(
	'admin_menu',
	function () {
		add_theme_page(
			'Theme Variation Display',
			'Theme Variation Display',
			'edit_theme_options',
			'wpwm-tvd',
			function () {
				$version   = '0.1.0';
				$file_time = file_exists( WPWM_TVD_DIR . 'assets/app.js' ) ? gmdate( 'Y-m-d H:i:s', filemtime( WPWM_TVD_DIR . 'assets/app.js' ) ) : 'unknown';
				echo '<div class="wrap">';
				// Required mount point for assets/app.js. The script looks for #wpwm-tvd-root and injects the variations UI here; deleting this div prevents rendering.
				echo '<div id="wpwm-tvd-root"></div>';
				echo '</div>';
			}
		);
	}
);

// Enqueue for our admin page
add_action(
	'admin_enqueue_scripts',
	function () {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return; }
		$screen = get_current_screen();
		if ( ! $screen || 'appearance_page_wpwm-tvd' !== $screen->id ) {
			return; }

		wp_enqueue_style( 'wpwm-tvd', WPWM_TVD_URL . 'assets/app.css', array(), filemtime( WPWM_TVD_DIR . 'assets/app.css' ) );
		// Enqueue wp-api to expose wpApiSettings.nonce
		wp_enqueue_script( 'wp-api' );
		wp_enqueue_script( 'wpwm-tvd', WPWM_TVD_URL . 'assets/app.js', array( 'wp-element', 'wp-data', 'wp-core-data', 'wp-api-fetch', 'wp-api' ), filemtime( WPWM_TVD_DIR . 'assets/app.js' ), true );

		$theme = wp_get_theme();
		wp_add_inline_script(
			'wpwm-tvd',
			'window.__WPWM_TVD__ = ' . wp_json_encode(
				array(
					'themeStylesheet' => $theme->get_stylesheet(),
					'pluginRestBase'  => rest_url( 'wpwm-tvd/v1' ),
					'pluginUrl'       => WPWM_TVD_URL,
				)
			) . ';',
			'before'
		);
		// Ensure apiFetch uses nonce in Site Editor
		wp_add_inline_script( 'wpwm-tvd', 'if(window.wp && wp.apiFetch && wp.apiFetch.createNonceMiddleware){ try { wp.apiFetch.use( wp.apiFetch.createNonceMiddleware( (window.wpApiSettings && wpApiSettings.nonce) || "" ) ); } catch(e){} }', 'before' );
		// Ensure apiFetch uses nonce in this admin screen
		wp_add_inline_script( 'wpwm-tvd', 'if(window.wp && wp.apiFetch && wp.apiFetch.createNonceMiddleware){ try { wp.apiFetch.use( wp.apiFetch.createNonceMiddleware( (window.wpApiSettings && wpApiSettings.nonce) || "" ) ); } catch(e){} }', 'before' );
	}
);

// Enqueue only in Site Editor (Appearance → Editor)
add_action(
	'enqueue_block_editor_assets',
	function () {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return; }
		$screen = get_current_screen();
		if ( ! $screen || 'site-editor' !== $screen->base ) {
			return; }

		// Enqueue error trap first (high priority) to catch errors early
		wp_enqueue_script( 'wpwm-tvd-error-trap', WPWM_TVD_URL . 'assets/error-trap.js', array(), filemtime( WPWM_TVD_DIR . 'assets/error-trap.js' ), false );

		wp_enqueue_style( 'wpwm-tvd', WPWM_TVD_URL . 'assets/app.css', array(), filemtime( WPWM_TVD_DIR . 'assets/app.css' ) );
		// Enqueue wp-api to expose wpApiSettings.nonce
		wp_enqueue_script( 'wp-api' );
		wp_enqueue_script( 'wpwm-tvd', WPWM_TVD_URL . 'assets/app.js', array( 'wp-element', 'wp-data', 'wp-core-data', 'wp-api-fetch', 'wp-api' ), filemtime( WPWM_TVD_DIR . 'assets/app.js' ), true );

		$theme = wp_get_theme();
		wp_add_inline_script(
			'wpwm-tvd',
			'window.__WPWM_TVD__ = ' . wp_json_encode(
				array(
					'themeStylesheet' => $theme->get_stylesheet(),
					'pluginRestBase'  => rest_url( 'wpwm-tvd/v1' ),
					'pluginUrl'       => WPWM_TVD_URL,
				)
			) . ';',
			'before'
		);
	}
);

// REST: aggregate variations from active theme and optional export.json in plugin folder.
add_action(
	'rest_api_init',
	function () {
		// GET branding (optional) from styles/agency-settings.json
		register_rest_route(
			'wpwm-tvd/v1',
			'/branding',
			array(
				'methods'             => 'GET',
				'permission_callback' => function () {
					return current_user_can( 'edit_theme_options' ); },
				'callback'            => function () {
					return rest_ensure_response( wpwm_tvd_get_agency_branding() );
				},
			)
		);

		// GET variations
		register_rest_route(
			'wpwm-tvd/v1',
			'/variations',
			array(
				'methods'             => 'GET',
				'permission_callback' => function () {
					return current_user_can( 'edit_theme_options' ); },
				'callback'            => function () {
					$variations = array();

					// Base theme palette from theme.json (used to augment variation palettes)
					$base_palette    = array();
					$theme_dir       = get_stylesheet_directory();
					$theme_json_path = trailingslashit( $theme_dir ) . 'theme.json';
					if ( file_exists( $theme_json_path ) ) {
						$raw_theme  = wpwm_tvd_read_local_file( $theme_json_path );
						$theme_conf = json_decode( $raw_theme, true );
						if ( is_array( $theme_conf ) ) {
							$bp = $theme_conf['settings']['color']['palette'] ?? array();
							if ( is_array( $bp ) ) {
								$base_palette = $bp;
							}
						}
					}

					// 1) Theme-provided variations in styles/*.json
					$styles_dir = trailingslashit( $theme_dir ) . 'styles/';
					if ( is_dir( $styles_dir ) ) {
						foreach ( glob( $styles_dir . '*.json' ) as $file ) {
							// Exclude plugin metadata / branding files (not actual theme variations)
							if ( strtolower( basename( $file ) ) === 'agency-settings.json' ) {
								continue;
							}
							$raw = wpwm_tvd_read_local_file( $file );
							if ( ! $raw ) {
								continue; }
							$json = json_decode( $raw, true );
							if ( ! is_array( $json ) ) {
								continue; }
							$slug         = pathinfo( $file, PATHINFO_FILENAME );
							$title        = isset( $json['title'] ) ? $json['title'] : $slug;
							$variations[] = array(
								'source'      => 'theme',
								'slug'        => $slug,
								'title'       => $title,
								'config'      => $json,
								'basePalette' => $base_palette,
							);
						}
					}

					// 2) Optional export file dropped by external app in plugin folder
					$export_file = WPWM_TVD_DIR . 'export.json';
					if ( file_exists( $export_file ) ) {
						$raw     = wpwm_tvd_read_local_file( $export_file );
						$payload = json_decode( $raw, true );
						if ( is_array( $payload ) ) {
							// accept either a single variation object or an array
							$items = isset( $payload[0] ) ? $payload : array( $payload );
							foreach ( $items as $json ) {
								if ( ! is_array( $json ) ) {
									continue; }
								$slug         = isset( $json['slug'] ) ? $json['slug'] : ( $json['title'] ?? 'exported' );
								$title        = isset( $json['title'] ) ? $json['title'] : $slug;
								$variations[] = array(
									'source'      => 'export',
									'slug'        => sanitize_title( $slug ),
									'title'       => $title,
									'config'      => $json,
									'basePalette' => $base_palette,
								);
							}
						}
					}

					return rest_ensure_response( array( 'variations' => $variations ) );
				},
			)
		);

		// GET current variation
		register_rest_route(
			'wpwm-tvd/v1',
			'/current',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => function () {
					$theme      = wp_get_theme();
					$stylesheet = $theme->get_stylesheet();

					// Find the global styles post for this theme
					$global_styles_query = new WP_Query(
						array(
							'post_type'      => 'wp_global_styles',
							'posts_per_page' => 1,
							'no_found_rows'  => true,
							// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
							'tax_query'      => array(
								array(
									'taxonomy' => 'wp_theme',
									'field'    => 'name',
									'terms'    => $stylesheet,
								),
							),
						)
					);

					if ( ! $global_styles_query->have_posts() ) {
						return rest_ensure_response(
							array(
								'current' => null,
								'message' => 'No global styles post found',
							)
						);
					}

					$global_styles_post = $global_styles_query->posts[0];
					$decoded_current = json_decode( $global_styles_post->post_content, true );
					$current_config  = is_array( $decoded_current ) ? $decoded_current : array();

					// WordPress stores the variation title in the config's 'title' field
					$matched_variation = null;
					$current_title     = isset( $current_config['title'] ) ? $current_config['title'] : '';

					wpwm_tvd_log_debug( 'WPWM-TVD: Current config title: ' . $current_title );
					wpwm_tvd_log_debug( 'WPWM-TVD: Post title: ' . $global_styles_post->post_title );

					// Get all variations to compare
					$styles_dir = get_stylesheet_directory() . '/styles';
					$variations = array();
					if ( is_dir( $styles_dir ) ) {
						$files = glob( $styles_dir . '/*.json' );
						foreach ( $files as $file ) {
							$json = wpwm_tvd_read_local_file( $file );
							$data = json_decode( $json, true );
							if ( $data && isset( $data['title'] ) ) {
								$variations[] = array(
									'title'  => $data['title'],
									'slug'   => basename( $file, '.json' ),
									'config' => $data,
								);
							}
						}
					}

					// Match by title - WordPress stores the variation title in the config
					if ( $current_title ) {
						foreach ( $variations as $variation ) {
							if ( $variation['title'] === $current_title ) {
								$matched_variation = $variation['slug'];
								wpwm_tvd_log_debug( 'WPWM-TVD: Matched by title: ' . $matched_variation );
								break;
							}
						}
					}

					return rest_ensure_response(
						array(
							'current'    => $matched_variation,
							'post_id'    => $global_styles_post->ID,
							'post_title' => $global_styles_post->post_title,
						)
					);
				},
			)
		);

		// POST apply variation
		register_rest_route(
			'wpwm-tvd/v1',
			'/apply',
			array(
				'methods'             => 'POST',
				'permission_callback' => function () {
					return current_user_can( 'edit_theme_options' ); },
				'callback'            => function ( $request ) {
					$variation_config = $request->get_json_params();

					if ( empty( $variation_config ) ) {
						return new WP_Error( 'no_config', 'No variation configuration provided', array( 'status' => 400 ) );
					}

					// Validate and fix structure issues (same as JavaScript validation)
					$errors     = array();
					$has_errors = false;

					// Validate palette structure
					if ( isset( $variation_config['settings']['color']['palette'] ) ) {
						$palette = $variation_config['settings']['color']['palette'];

						// Check if palette is a flat array (variation format) vs origin-wrapped (database format)
						if ( ! wp_is_numeric_array( $palette ) ) {
							// Origin-wrapped format - validate each origin
							foreach ( $palette as $origin => $colors ) {
								if ( is_array( $colors ) && ! wp_is_numeric_array( $colors ) ) {
									$has_errors = true;
									$errors[]   = array(
										'type'   => 'PALETTE_STRUCTURE_ERROR',
										'origin' => $origin,
										'issue'  => 'Palette is an object with numeric keys instead of an array',
										'count'  => count( $colors ),
									);
									// Fix: Convert to proper array
									$variation_config['settings']['color']['palette'][ $origin ] = array_values( $colors );
								}
							}
						}
					}

					// Validate fontFamilies structure
					if ( isset( $variation_config['settings']['typography']['fontFamilies'] ) ) {
						foreach ( $variation_config['settings']['typography']['fontFamilies'] as $origin => $fonts ) {
							if ( is_array( $fonts ) && ! wp_is_numeric_array( $fonts ) ) {
								$has_errors = true;
								$errors[]   = array(
									'type'   => 'FONT_FAMILIES_STRUCTURE_ERROR',
									'origin' => $origin,
									'issue'  => 'fontFamilies is an object with numeric keys instead of an array',
									'count'  => count( $fonts ),
								);
								$variation_config['settings']['typography']['fontFamilies'][ $origin ] = array_values( $fonts );
							}
						}
					}

					// Validate fontSizes structure
					if ( isset( $variation_config['settings']['typography']['fontSizes'] ) ) {
						foreach ( $variation_config['settings']['typography']['fontSizes'] as $origin => $sizes ) {
							if ( is_array( $sizes ) && ! wp_is_numeric_array( $sizes ) ) {
								$has_errors = true;
								$errors[]   = array(
									'type'   => 'FONT_SIZES_STRUCTURE_ERROR',
									'origin' => $origin,
									'issue'  => 'fontSizes is an object with numeric keys instead of an array',
									'count'  => count( $sizes ),
								);
								$variation_config['settings']['typography']['fontSizes'][ $origin ] = array_values( $sizes );
							}
						}
					}

					// Log errors if found
					if ( $has_errors ) {
						$log_file   = WPWM_TVD_DIR . 'better-variation-display-error.log';
						$log_entry  = "\n" . str_repeat( '=', 80 ) . "\n";
						$log_entry .= 'TIMESTAMP: ' . gmdate( 'Y-m-d H:i:s' ) . " UTC\n";
						$log_entry .= "VARIATION: Applied via REST API\n";
						$log_entry .= "SOURCE: REST API endpoint\n";
						$log_entry .= 'ERROR COUNT: ' . count( $errors ) . "\n";
						$log_entry .= str_repeat( '-', 80 ) . "\n\n";

						foreach ( $errors as $index => $error ) {
							$log_entry .= 'ERROR #' . ( $index + 1 ) . ":\n";
							$log_entry .= '  TYPE: ' . $error['type'] . "\n";
							$log_entry .= '  ORIGIN: ' . $error['origin'] . "\n";
							$log_entry .= '  ISSUE: ' . $error['issue'] . "\n";
							$log_entry .= '  ITEM COUNT: ' . $error['count'] . "\n\n";
						}

						$log_entry .= str_repeat( '=', 80 ) . "\n";

						// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
						file_put_contents( $log_file, $log_entry, FILE_APPEND );
					}

					// Get the current theme's global styles post
					$theme      = wp_get_theme();
					$stylesheet = $theme->get_stylesheet();

					// Find the global styles post for this theme
					$global_styles_query = new WP_Query(
						array(
							'post_type'      => 'wp_global_styles',
							'posts_per_page' => 1,
							'no_found_rows'  => true,
							// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
							'tax_query'      => array(
								array(
									'taxonomy' => 'wp_theme',
									'field'    => 'name',
									'terms'    => $stylesheet,
								),
							),
						)
					);

					if ( ! $global_styles_query->have_posts() ) {
						// Create a new global styles post if it doesn't exist
						$global_styles_post_id = wp_insert_post(
							array(
								'post_type'    => 'wp_global_styles',
								'post_status'  => 'publish',
								'post_title'   => 'Custom Styles',
								'post_name'    => 'wp-global-styles-' . $stylesheet,
								'post_content' => wp_json_encode( array() ),
							),
							true
						);

						if ( is_wp_error( $global_styles_post_id ) ) {
							return $global_styles_post_id;
						}

						// Associate with theme taxonomy
						wp_set_object_terms( $global_styles_post_id, $stylesheet, 'wp_theme' );

						$global_styles_post = get_post( $global_styles_post_id );
					} else {
						$global_styles_post = $global_styles_query->posts[0];
					}

					// Get existing content and merge with variation config
					$decoded_existing = json_decode( $global_styles_post->post_content, true );
					$existing_config  = is_array( $decoded_existing ) ? $decoded_existing : array();

					// Debug logging
					wpwm_tvd_log_debug( '=== WPWM-TVD: Applying Variation ===' );
					wpwm_tvd_log_debug( 'Post ID: ' . $global_styles_post->ID );
					wpwm_tvd_log_debug( 'Theme: ' . $stylesheet );

					// Log incoming palette
					if ( isset( $variation_config['settings']['color']['palette'] ) ) {
						$incoming_palette = $variation_config['settings']['color']['palette'];
						wpwm_tvd_log_debug( 'Incoming palette type: ' . ( wp_is_numeric_array( $incoming_palette ) ? 'flat array' : 'origin-wrapped' ) );
						if ( wp_is_numeric_array( $incoming_palette ) ) {
							$primary_light = null;
							foreach ( $incoming_palette as $color ) {
								if ( isset( $color['slug'] ) && false !== strpos( $color['slug'], 'primary-light' ) ) {
									$primary_light = $color;
									break;
								}
							}
							if ( $primary_light ) {
								wpwm_tvd_log_debug( 'Incoming primary-light: ' . wp_json_encode( $primary_light ) );
							}
						}
					}

					// CRITICAL: Wrap flat array palettes in 'theme' origin before merging
					// This prevents array_replace_recursive from creating numeric keys
					if ( isset( $variation_config['settings']['color']['palette'] ) && wp_is_numeric_array( $variation_config['settings']['color']['palette'] ) ) {
						wpwm_tvd_log_debug( 'Wrapping flat palette array in theme origin' );
						$variation_config['settings']['color']['palette'] = array(
							'theme' => $variation_config['settings']['color']['palette'],
						);
					}

					// Same for fontFamilies
					if ( isset( $variation_config['settings']['typography']['fontFamilies'] ) && wp_is_numeric_array( $variation_config['settings']['typography']['fontFamilies'] ) ) {
						$variation_config['settings']['typography']['fontFamilies'] = array(
							'theme' => $variation_config['settings']['typography']['fontFamilies'],
						);
					}

					// Same for fontSizes
					if ( isset( $variation_config['settings']['typography']['fontSizes'] ) && wp_is_numeric_array( $variation_config['settings']['typography']['fontSizes'] ) ) {
						$variation_config['settings']['typography']['fontSizes'] = array(
							'theme' => $variation_config['settings']['typography']['fontSizes'],
						);
					}

					$merged_config = array_replace_recursive( $existing_config, $variation_config );

					// Log merged palette
					if ( isset( $merged_config['settings']['color']['palette']['theme'] ) ) {
						$merged_palette = $merged_config['settings']['color']['palette']['theme'];
						$primary_light  = null;
						foreach ( $merged_palette as $color ) {
							if ( isset( $color['slug'] ) && false !== strpos( $color['slug'], 'primary-light' ) ) {
								$primary_light = $color;
								break;
							}
						}
						if ( $primary_light ) {
							wpwm_tvd_log_debug( 'Merged primary-light: ' . wp_json_encode( $primary_light ) );
						}
					}

					// Update the post
					$result = wp_update_post(
						array(
							'ID'           => $global_styles_post->ID,
							'post_content' => wp_json_encode( $merged_config ),
						),
						true
					);

					wpwm_tvd_log_debug( 'Update result: ' . ( is_wp_error( $result ) ? 'ERROR' : 'SUCCESS' ) );
					wpwm_tvd_log_debug( '=== End WPWM-TVD ===' );

					if ( is_wp_error( $result ) ) {
						return $result;
					}

					return rest_ensure_response(
						array(
							'success' => true,
							'message' => 'Variation applied successfully',
							'post_id' => $global_styles_post->ID,
						)
					);
				},
			)
		);

		// POST log errors
		register_rest_route(
			'wpwm-tvd/v1',
			'/log-error',
			array(
				'methods'             => 'POST',
				'permission_callback' => function () {
					return current_user_can( 'edit_theme_options' ); },
				'callback'            => function ( $request ) {
					$data = $request->get_json_params();

					if ( empty( $data ) ) {
						return new WP_Error( 'no_data', 'No error data provided', array( 'status' => 400 ) );
					}

					$log_file    = WPWM_TVD_DIR . 'better-variation-display-error.log';
					$timestamp   = isset( $data['timestamp'] ) ? $data['timestamp'] : gmdate( 'Y-m-d H:i:s' );
					$variation   = isset( $data['variation'] ) ? $data['variation'] : 'unknown';
					$source_file = isset( $data['sourceFile'] ) ? $data['sourceFile'] : 'unknown';
					$errors      = isset( $data['errors'] ) ? $data['errors'] : array();

					// Format log entry with line breaks and labels for legibility
					$log_entry  = "\n" . str_repeat( '=', 80 ) . "\n";
					$log_entry .= "TIMESTAMP: {$timestamp}\n";
					$log_entry .= "VARIATION: {$variation}\n";
					$log_entry .= "SOURCE FILE: {$source_file}\n";
					$log_entry .= 'ERROR COUNT: ' . count( $errors ) . "\n";
					$log_entry .= str_repeat( '-', 80 ) . "\n\n";

					foreach ( $errors as $index => $error ) {
						$log_entry .= 'ERROR #' . ( $index + 1 ) . ":\n";
						$log_entry .= '  TYPE: ' . ( $error['type'] ?? 'UNKNOWN' ) . "\n";
						$log_entry .= '  ORIGIN: ' . ( $error['origin'] ?? 'N/A' ) . "\n";
						$log_entry .= '  ISSUE: ' . ( $error['issue'] ?? 'No description' ) . "\n";

						if ( isset( $error['index'] ) ) {
							$log_entry .= '  INDEX: ' . $error['index'] . "\n";
						}

						if ( isset( $error['itemCount'] ) ) {
							$log_entry .= '  ITEM COUNT: ' . $error['itemCount'] . "\n";
						}

						if ( isset( $error['entry'] ) ) {
							$log_entry .= "  ENTRY DATA:\n";
							$log_entry .= '    ' . str_replace( "\n", "\n    ", wp_json_encode( $error['entry'], JSON_PRETTY_PRINT ) ) . "\n";
						}

						if ( isset( $error['originalStructure'] ) ) {
							$log_entry .= "  ORIGINAL STRUCTURE (first 5 items):\n";
							$sample     = array_slice( $error['originalStructure'], 0, 5, true );
							$log_entry .= '    ' . str_replace( "\n", "\n    ", wp_json_encode( $sample, JSON_PRETTY_PRINT ) ) . "\n";
						}

						$log_entry .= "\n";
					}

					$log_entry .= str_repeat( '=', 80 ) . "\n";

					// Append to log file
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
						$result = file_put_contents( $log_file, $log_entry, FILE_APPEND );

					if ( false === $result ) {
						return new WP_Error( 'log_failed', 'Could not write to log file', array( 'status' => 500 ) );
					}

					return rest_ensure_response(
						array(
							'success'  => true,
							'message'  => 'Error logged successfully',
							'log_file' => basename( $log_file ),
						)
					);
				},
			)
		);
	}
);

// Small notice to host a panel container
add_action(
	'admin_footer',
	function () {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return; }
		$screen = get_current_screen();
		if ( ! $screen || 'site-editor' !== $screen->base ) {
			return; }
		echo '<div id="wpwm-tvd-root" style="display:none"></div>';
	}
);

/**
 * WP-CLI command to validate and fix global styles data.
 * Usage: wp wpwm-tvd validate-global-styles [--fix] [--theme=<theme-slug>]
 */

// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound, WordPress.Security.EscapeOutput.OutputNotEscaped
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command(
		'wpwm-tvd validate-global-styles',
		function ( $args, $assoc_args ) {
			$fix        = isset( $assoc_args['fix'] );
			$theme_slug = isset( $assoc_args['theme'] ) ? $assoc_args['theme'] : wp_get_theme()->get_stylesheet();

			WP_CLI::line( 'Validating global styles for theme: ' . $theme_slug );

			// Find global styles post
			$query = new WP_Query(
				array(
					'post_type'      => 'wp_global_styles',
					'posts_per_page' => 1,
					'no_found_rows'  => true,
					'tax_query'      => array(
						array(
							'taxonomy' => 'wp_theme',
							'field'    => 'name',
							'terms'    => $theme_slug,
						),
					),
				)
			);

			if ( ! $query->have_posts() ) {
				WP_CLI::error( 'No global styles post found for theme: ' . $theme_slug );
			}

			$post    = $query->posts[0];
			$content = json_decode( $post->post_content, true );

			if ( ! is_array( $content ) ) {
				WP_CLI::error( 'Invalid JSON in global styles post' );
			}

			$errors = array();
			$fixed  = array();

			// Check palette structure
			if ( isset( $content['settings']['color']['palette'] ) ) {
				$palette = $content['settings']['color']['palette'];

				// Check if palette is a flat array (normal) vs origin-wrapped (also normal)
				if ( wp_is_numeric_array( $palette ) ) {
					// Flat array format - validate each entry
					foreach ( $palette as $index => $color ) {
						if ( ! is_array( $color ) ) {
							$errors[] = "Palette[$index] is not an array";
							continue;
						}
						if ( empty( $color['slug'] ) ) {
							$errors[] = "Palette[$index] missing slug: " . wp_json_encode( $color );
						}
						if ( empty( $color['color'] ) ) {
							$errors[] = "Palette[$index] missing color value";
						}
					}
				} else {
					// Origin-wrapped format - validate each origin
					foreach ( $palette as $origin => $colors ) {
						if ( is_array( $colors ) ) {
							// Check if it's an object with numeric keys
							if ( ! wp_is_numeric_array( $colors ) ) {
								$errors[] = "Palette[$origin] is an object with numeric keys (should be array)";
								if ( $fix ) {
									$content['settings']['color']['palette'][ $origin ] = array_values( $colors );
									$fixed[] = "Fixed palette[$origin] structure";
								}
							}

							// Check each entry for missing slugs
							foreach ( $colors as $index => $color ) {
								if ( ! is_array( $color ) ) {
									$errors[] = "Palette[$origin][$index] is not an array";
									continue;
								}
								if ( empty( $color['slug'] ) ) {
									$errors[] = "Palette[$origin][$index] missing slug: " . wp_json_encode( $color );
								}
								if ( empty( $color['color'] ) ) {
									$errors[] = "Palette[$origin][$index] missing color value";
								}
							}
						}
					}
				}
			}

			// Check fontFamilies structure
			if ( isset( $content['settings']['typography']['fontFamilies'] ) ) {
				foreach ( $content['settings']['typography']['fontFamilies'] as $origin => $fonts ) {
					if ( is_array( $fonts ) && ! wp_is_numeric_array( $fonts ) ) {
						$errors[] = "fontFamilies[$origin] is an object with numeric keys (should be array)";
						if ( $fix ) {
							$content['settings']['typography']['fontFamilies'][ $origin ] = array_values( $fonts );
							$fixed[] = "Fixed fontFamilies[$origin] structure";
						}
					}
				}
			}

			// Check fontSizes structure
			if ( isset( $content['settings']['typography']['fontSizes'] ) ) {
				foreach ( $content['settings']['typography']['fontSizes'] as $origin => $sizes ) {
					if ( is_array( $sizes ) && ! wp_is_numeric_array( $sizes ) ) {
						$errors[] = "fontSizes[$origin] is an object with numeric keys (should be array)";
						if ( $fix ) {
							$content['settings']['typography']['fontSizes'][ $origin ] = array_values( $sizes );
							$fixed[] = "Fixed fontSizes[$origin] structure";
						}
					}
				}
			}

			// Report results
			if ( empty( $errors ) ) {
				WP_CLI::success( 'No errors found! Global styles data is valid.' );
				return;
			}

			WP_CLI::warning( 'Found ' . count( $errors ) . ' error(s):' );
			foreach ( $errors as $error ) {
				WP_CLI::line( '  - ' . $error );
			}

			if ( $fix ) {
				if ( ! empty( $fixed ) ) {
					// Save fixed content
					wp_update_post(
						array(
							'ID'           => $post->ID,
							'post_content' => wp_json_encode( $content ),
						)
					);

					WP_CLI::success( 'Fixed ' . count( $fixed ) . ' issue(s):' );
					foreach ( $fixed as $fix_msg ) {
						WP_CLI::line( '  - ' . $fix_msg );
					}
				} else {
					WP_CLI::line( 'No auto-fixable issues found. Manual correction required.' );
				}
			} else {
				WP_CLI::line( '' );
				WP_CLI::line( 'Run with --fix flag to automatically fix structure issues:' );
				WP_CLI::line( '  wp wpwm-tvd validate-global-styles --fix' );
			}
		}
	);
}

// phpcs:enable Squiz.Commenting.InlineComment.InvalidEndChar
