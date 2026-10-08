<?php
/**
 * Plugin Name:       StatChasers — Rookie Hit Rates
 * Plugin URI:        https://statchasers.com/
 * Description:        Embed the StatChasers Rookie Hit Rates dynasty analytics tool anywhere with the [rookie_hit_rates] shortcode. The whole app is self-contained (runs in an isolated iframe) so it never conflicts with your theme's styles.
 * Version:           1.0.0
 * Author:            StatChasers
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 5.0
 * Requires PHP:      7.0
 *
 * Usage: place  [rookie_hit_rates]  into any page, post, or "Code" module.
 * Optional attributes:
 *   height     Initial iframe height in px before auto-resize kicks in. Default 1400.
 *   min_height Never shrink the iframe below this many px. Default 600.
 *   max_width  Max width of the embed in px (centered). Default 1380. Use 0 for full width.
 *
 * Example: [rookie_hit_rates height="1500" max_width="0"]
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

/**
 * Absolute URL to the bundled single-page app folder (with trailing slash).
 */
function scff_rhr_app_url() {
	return trailingslashit( plugins_url( 'app', __FILE__ ) );
}

/**
 * Render the [rookie_hit_rates] shortcode as a responsive, auto-resizing iframe.
 *
 * @param array $atts Shortcode attributes.
 * @return string HTML markup.
 */
function scff_rhr_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'height'     => '1400',
			'min_height' => '600',
			'max_width'  => '1380',
		),
		$atts,
		'rookie_hit_rates'
	);

	$app        = esc_url( scff_rhr_app_url() . 'index.html' );
	$height     = max( 200, (int) $atts['height'] );
	$min_height = max( 0, (int) $atts['min_height'] );
	$max_width  = max( 0, (int) $atts['max_width'] );
	$uid        = 'rhr-' . wp_generate_uuid4();

	// Print the parent-side auto-resize listener only once per page load, no
	// matter how many embeds are on the page.
	static $listener_printed = false;
	$listener = '';
	if ( ! $listener_printed ) {
		$listener_printed = true;
		$listener        = '<script>(function(){window.addEventListener("message",function(e){var d=e.data;if(!d||d.__rhr!==true||d.type!=="rhr-height")return;var frames=document.querySelectorAll("iframe.rhr-embed-frame");for(var i=0;i<frames.length;i++){if(frames[i].contentWindow===e.source){var min=parseInt(frames[i].getAttribute("data-min-height"),10)||0;frames[i].style.height=Math.max(d.height,min)+"px";}}});})();</script>';
	}

	$wrap_style = 'width:100%;margin:0 auto;';
	if ( $max_width > 0 ) {
		$wrap_style .= 'max-width:' . $max_width . 'px;';
	}

	$frame_style = 'width:100%;height:' . $height . 'px;border:0;display:block;overflow:hidden;';

	$iframe = sprintf(
		// No loading="lazy": the embed is the page's main content, and deferring it
		// keeps the app from measuring itself until the reader scrolls down.
		'<iframe class="rhr-embed-frame" id="%1$s" src="%2$s" title="Rookie Hit Rates" scrolling="no" data-min-height="%3$d" style="%4$s"></iframe>',
		esc_attr( $uid ),
		$app,
		$min_height,
		esc_attr( $frame_style )
	);

	return $listener
		. '<div class="rhr-embed-wrap" style="' . esc_attr( $wrap_style ) . '">'
		. $iframe
		. '</div>';
}
add_shortcode( 'rookie_hit_rates', 'scff_rhr_shortcode' );
// Convenience alias.
add_shortcode( 'statchasers_rookie_hit_rates', 'scff_rhr_shortcode' );
