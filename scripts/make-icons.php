<?php
/**
 * App icons for the mobile app: the firm's scales of justice in gold on the
 * brand's ink ground, drawn at 1024 so every downscale stays crisp.
 *
 * Coordinates follow the same 120-unit grid as logo.svg on the website, so
 * the mark on the phone is the mark on the site.
 */

const INK  = [0x17, 0x14, 0x0f];
const GOLD = [0xb5, 0x8e, 0x32];

/**
 * Draws the scales on a transparent canvas of the given size.
 * $scale maps the 120-unit design grid onto the canvas, $inset shrinks the
 * mark within the canvas (Android's adaptive icon crops the outer ~25%).
 */
function drawScales(int $size, float $markFraction): GdImage
{
    $im = imagecreatetruecolor($size, $size);
    imagesavealpha($im, true);
    imagefill($im, 0, 0, imagecolorallocatealpha($im, 0, 0, 0, 127));
    imagealphablending($im, true);

    $gold = imagecolorallocate($im, GOLD[0], GOLD[1], GOLD[2]);

    // The design grid is 120x120; centre it and scale to the requested fraction.
    $s = ($size * $markFraction) / 120.0;
    $ox = ($size - 120 * $s) / 2;
    $oy = ($size - 120 * $s) / 2;

    $X = fn(float $x) => (int) round($ox + $x * $s);
    $Y = fn(float $y) => (int) round($oy + $y * $s);
    $rect = function (float $x, float $y, float $w, float $h) use ($im, $gold, $X, $Y) {
        imagefilledrectangle($im, $X($x), $Y($y), $X($x + $w), $Y($y + $h), $gold);
    };
    $poly = function (array $pts) use ($im, $gold, $X, $Y) {
        $flat = [];
        foreach ($pts as [$px, $py]) { $flat[] = $X($px); $flat[] = $Y($py); }
        imagefilledpolygon($im, $flat, $gold);
    };

    $rect(52, 14, 16, 8);    // finial
    $rect(55, 22, 10, 70);   // central column
    $rect(14, 26, 92, 9);    // cross beam
    $rect(42, 85, 36, 8);    // base
    $rect(32, 93, 56, 9);    // plinth
    $rect(22, 35, 4, 16);    // left hanger
    $poly([[6, 51], [42, 51], [31, 71], [17, 71]]);   // left pan
    $rect(94, 35, 4, 16);    // right hanger
    $poly([[78, 51], [114, 51], [103, 71], [89, 71]]); // right pan

    return $im;
}

/** Composites the mark over a solid ink ground. */
function onInk(int $size, float $markFraction): GdImage
{
    $bg = imagecreatetruecolor($size, $size);
    imagefill($bg, 0, 0, imagecolorallocate($bg, INK[0], INK[1], INK[2]));
    $mark = drawScales($size, $markFraction);
    imagecopy($bg, $mark, 0, 0, 0, 0, $size, $size);
    imagedestroy($mark);
    return $bg;
}

$out = $argv[1];
@mkdir($out, 0755, true);

// iOS / general app icon — full bleed, no transparency (Apple rejects alpha).
imagepng(onInk(1024, 0.58), "$out/icon.png");

// Android adaptive icon foreground: transparent, and the mark kept well
// inside the safe zone because the launcher crops to a circle or squircle.
imagepng(drawScales(1024, 0.42), "$out/adaptive-icon.png");

// Splash: the mark on ink, smaller, centred.
imagepng(onInk(1284, 0.30), "$out/splash-icon.png");

// Web favicon.
imagepng(onInk(48, 0.66), "$out/favicon.png");

foreach (["icon.png", "adaptive-icon.png", "splash-icon.png", "favicon.png"] as $f) {
    $i = getimagesize("$out/$f");
    printf("%-20s %dx%d  %s KB\n", $f, $i[0], $i[1], number_format(filesize("$out/$f") / 1024, 1));
}
