# CryptoPrices app icon

The CryptoPrices icon uses a warm ivory tile (`#f1eee6`), dark ink (`#262d29`) and a small vermilion point (`#c35532`). Its italic `cp` follows the application's editorial monogram. Letterforms are vector outlines from the locally installed Georgia italic face; the exported SVG has no font, image or network dependency.

`icon.svg` is the editable source. `icon.png` is the transparent 1024×1024 master. `icon.ico` contains 16, 24, 32, 48, 64, 128 and 256 pixel PNG frames. `icon.iconset` contains the standard macOS 1×/2× sizes, and `icon.icns` is built from that set.

To reproduce the raster and platform exports from this directory's SVG, use the repository's installed Electron version:

```sh
npm exec electron build/brand/generate-icons.cjs
```

The script loads only an embedded SVG and blocks HTTP(S) requests. It uses Electron's native image resampling and writes only within this folder. macOS additionally runs the built-in `iconutil`; other platforms still produce the PNG, ICO and iconset. Linux requires a graphical session or Xvfb for Electron rendering.

Suggested packaging paths are `build/brand/icon.icns` for macOS, `build/brand/icon.ico` for Windows and `build/brand/icon.png` for Linux. The former template icons have been retired.
