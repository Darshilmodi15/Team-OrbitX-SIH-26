#!/usr/bin/env python3
"""
Generate all Matsya raster assets from the matsya-mark.svg vector specification
using macOS CoreGraphics + CoreText via ctypes (zero third-party deps).

Outputs in frontend/public/:
- favicon-16x16.png, favicon-32x32.png
- favicon.ico (16x16, 32x32, 48x48 multi-size PNG ICO)
- apple-touch-icon.png (180x180)
- android-chrome-192x192.png (192x192)
- android-chrome-512x512.png (512x512)
- icon-maskable-512x512.png (512x512 with safe-zone padding)
- og-image.png (1200x630 Open Graph preview card)
"""
from __future__ import annotations

import ctypes
import pathlib
import struct
import sys
import zlib

cf = ctypes.CDLL("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation")
cg = ctypes.CDLL("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics")
ct = ctypes.CDLL("/System/Library/Frameworks/CoreText.framework/CoreText")

CGFloat = ctypes.c_double
c_void_p = ctypes.c_void_p
c_size_t = ctypes.c_size_t
c_uint32 = ctypes.c_uint32
c_int = ctypes.c_int


class CGPoint(ctypes.Structure):
    _fields_ = [("x", CGFloat), ("y", CGFloat)]


class CGSize(ctypes.Structure):
    _fields_ = [("width", CGFloat), ("height", CGFloat)]


class CGRect(ctypes.Structure):
    _fields_ = [("origin", CGPoint), ("size", CGSize)]


class CGAffineTransform(ctypes.Structure):
    _fields_ = [
        ("a", CGFloat), ("b", CGFloat),
        ("c", CGFloat), ("d", CGFloat),
        ("tx", CGFloat), ("ty", CGFloat),
    ]


# CoreFoundation signatures
cf.CFStringCreateWithCString.argtypes = [c_void_p, ctypes.c_char_p, c_uint32]
cf.CFStringCreateWithCString.restype = c_void_p
cf.CFDictionaryCreate.argtypes = [
    c_void_p, ctypes.POINTER(c_void_p), ctypes.POINTER(c_void_p),
    ctypes.c_long, c_void_p, c_void_p,
]
cf.CFDictionaryCreate.restype = c_void_p
cf.CFAttributedStringCreate.argtypes = [c_void_p, c_void_p, c_void_p]
cf.CFAttributedStringCreate.restype = c_void_p
cf.CFRelease.argtypes = [c_void_p]
cf.CFRelease.restype = None

kCFStringEncodingUTF8 = 0x08000100
kCFTypeDictionaryKeyCallBacks = c_void_p.in_dll(cf, "kCFTypeDictionaryKeyCallBacks")
kCFTypeDictionaryValueCallBacks = c_void_p.in_dll(cf, "kCFTypeDictionaryValueCallBacks")

# CoreText signatures
ct.CTFontCreateWithName.argtypes = [c_void_p, CGFloat, c_void_p]
ct.CTFontCreateWithName.restype = c_void_p
ct.CTLineCreateWithAttributedString.argtypes = [c_void_p]
ct.CTLineCreateWithAttributedString.restype = c_void_p
ct.CTLineDraw.argtypes = [c_void_p, c_void_p]
ct.CTLineDraw.restype = None
kCTFontAttributeName = c_void_p.in_dll(ct, "kCTFontAttributeName")
kCTForegroundColorAttributeName = c_void_p.in_dll(ct, "kCTForegroundColorAttributeName")

# CoreGraphics signatures
cg.CGColorSpaceCreateDeviceRGB.argtypes = []
cg.CGColorSpaceCreateDeviceRGB.restype = c_void_p
cg.CGColorSpaceRelease.argtypes = [c_void_p]
cg.CGColorCreate.argtypes = [c_void_p, ctypes.POINTER(CGFloat)]
cg.CGColorCreate.restype = c_void_p
cg.CGColorRelease.argtypes = [c_void_p]
cg.CGBitmapContextCreate.argtypes = [
    c_void_p, c_size_t, c_size_t, c_size_t, c_size_t, c_void_p, c_uint32,
]
cg.CGBitmapContextCreate.restype = c_void_p
cg.CGContextRelease.argtypes = [c_void_p]
cg.CGContextSetAllowsAntialiasing.argtypes = [c_void_p, ctypes.c_bool]
cg.CGContextSetShouldAntialias.argtypes = [c_void_p, ctypes.c_bool]
cg.CGContextSaveGState.argtypes = [c_void_p]
cg.CGContextRestoreGState.argtypes = [c_void_p]
cg.CGContextTranslateCTM.argtypes = [c_void_p, CGFloat, CGFloat]
cg.CGContextScaleCTM.argtypes = [c_void_p, CGFloat, CGFloat]
cg.CGContextSetRGBFillColor.argtypes = [c_void_p, CGFloat, CGFloat, CGFloat, CGFloat]
cg.CGContextSetRGBStrokeColor.argtypes = [c_void_p, CGFloat, CGFloat, CGFloat, CGFloat]
cg.CGContextSetLineWidth.argtypes = [c_void_p, CGFloat]
cg.CGContextSetLineCap.argtypes = [c_void_p, c_int]
cg.CGContextSetLineJoin.argtypes = [c_void_p, c_int]
cg.CGContextFillRect.argtypes = [c_void_p, CGRect]
cg.CGContextFillEllipseInRect.argtypes = [c_void_p, CGRect]
cg.CGContextStrokeEllipseInRect.argtypes = [c_void_p, CGRect]
cg.CGContextAddEllipseInRect.argtypes = [c_void_p, CGRect]
cg.CGContextBeginPath.argtypes = [c_void_p]
cg.CGContextMoveToPoint.argtypes = [c_void_p, CGFloat, CGFloat]
cg.CGContextAddLineToPoint.argtypes = [c_void_p, CGFloat, CGFloat]
cg.CGContextAddCurveToPoint.argtypes = [c_void_p, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat]
cg.CGContextAddQuadCurveToPoint.argtypes = [c_void_p, CGFloat, CGFloat, CGFloat, CGFloat]
cg.CGContextAddArcToPoint.argtypes = [c_void_p, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat]
cg.CGContextClosePath.argtypes = [c_void_p]
cg.CGContextFillPath.argtypes = [c_void_p]
cg.CGContextStrokePath.argtypes = [c_void_p]
cg.CGContextClip.argtypes = [c_void_p]
cg.CGContextSetTextMatrix.argtypes = [c_void_p, CGAffineTransform]
cg.CGContextSetTextPosition.argtypes = [c_void_p, CGFloat, CGFloat]
cg.CGGradientCreateWithColorComponents.argtypes = [
    c_void_p, ctypes.POINTER(CGFloat), ctypes.POINTER(CGFloat), c_size_t,
]
cg.CGGradientCreateWithColorComponents.restype = c_void_p
cg.CGGradientRelease.argtypes = [c_void_p]
cg.CGContextDrawLinearGradient.argtypes = [c_void_p, c_void_p, CGPoint, CGPoint, c_uint32]
cg.CGContextDrawRadialGradient.argtypes = [
    c_void_p, c_void_p, CGPoint, CGFloat, CGPoint, CGFloat, c_uint32,
]

# Brand tokens
TEAL = (0x2F / 255.0, 0xB5 / 255.0, 0xA3 / 255.0, 1.0)
SOFT_TEAL = (0xBD / 255.0, 0xEF / 255.0, 0xE6 / 255.0, 1.0)
BLUE = (0x4A / 255.0, 0xB3 / 255.0, 0xF4 / 255.0, 1.0)
INK = (0x12 / 255.0, 0x23 / 255.0, 0x2B / 255.0, 1.0)
BG_LIGHT = (0xF2 / 255.0, 0xFA / 255.0, 0xF8 / 255.0, 1.0)
BG_DARK = (0x0A / 255.0, 0x18 / 255.0, 0x1E / 255.0, 1.0)
TILE_DARK = (0x10 / 255.0, 0x25 / 255.0, 0x2D / 255.0, 1.0)
INK_DARK = (0xDD / 255.0, 0xF7 / 255.0, 0xF2 / 255.0, 1.0)
RING_FILL_DARK = (0x1C / 255.0, 0x4A / 255.0, 0x50 / 255.0, 1.0)


def rect(x: float, y: float, w: float, h: float) -> CGRect:
    return CGRect(CGPoint(x, y), CGSize(w, h))


def add_rounded_rect(ctx, x: float, y: float, w: float, h: float, r: float) -> None:
    cg.CGContextBeginPath(ctx)
    cg.CGContextMoveToPoint(ctx, x + r, y)
    cg.CGContextAddArcToPoint(ctx, x + w, y, x + w, y + h, r)
    cg.CGContextAddArcToPoint(ctx, x + w, y + h, x, y + h, r)
    cg.CGContextAddArcToPoint(ctx, x, y + h, x, y, r)
    cg.CGContextAddArcToPoint(ctx, x, y, x + w, y, r)
    cg.CGContextClosePath(ctx)


def draw_matsya_mark(ctx, x: float, y: float, size: float, dark: bool = False) -> None:
    """Draw the exact matsya-mark.svg geometry inside (x, y, size, size) in CG coordinates."""
    cg.CGContextSaveGState(ctx)
    # Map SVG 120x120 top-left coordinates (y down) into CG coordinates (y up)
    cg.CGContextTranslateCTM(ctx, x, y + size)
    cg.CGContextScaleCTM(ctx, size / 120.0, -size / 120.0)

    ring_fill = RING_FILL_DARK if dark else SOFT_TEAL
    ink = INK_DARK if dark else INK

    # Outer circle: cx=60, cy=60, r=52
    cg.CGContextSetRGBFillColor(ctx, *ring_fill)
    cg.CGContextFillEllipseInRect(ctx, rect(8, 8, 104, 104))
    cg.CGContextSetRGBStrokeColor(ctx, *TEAL)
    cg.CGContextSetLineWidth(ctx, 4.0)
    cg.CGContextStrokeEllipseInRect(ctx, rect(8, 8, 104, 104))

    # Fish body: M26 52 C38 32 66 32 78 52 C66 72 38 72 26 52 Z
    cg.CGContextSetRGBFillColor(ctx, *TEAL)
    cg.CGContextBeginPath(ctx)
    cg.CGContextMoveToPoint(ctx, 26, 52)
    cg.CGContextAddCurveToPoint(ctx, 38, 32, 66, 32, 78, 52)
    cg.CGContextAddCurveToPoint(ctx, 66, 72, 38, 72, 26, 52)
    cg.CGContextClosePath(ctx)
    cg.CGContextFillPath(ctx)

    # Fish tail: M76 52 L96 38 Q91 52 96 66 Z
    cg.CGContextBeginPath(ctx)
    cg.CGContextMoveToPoint(ctx, 76, 52)
    cg.CGContextAddLineToPoint(ctx, 96, 38)
    cg.CGContextAddQuadCurveToPoint(ctx, 91, 52, 96, 66)
    cg.CGContextClosePath(ctx)
    cg.CGContextFillPath(ctx)

    # Eye: cx=40, cy=49, r=3.4
    cg.CGContextSetRGBFillColor(ctx, *ink)
    cg.CGContextFillEllipseInRect(ctx, rect(40 - 3.4, 49 - 3.4, 6.8, 6.8))

    # Clipped wave: clip circle cx=60, cy=60, r=47
    cg.CGContextSaveGState(ctx)
    cg.CGContextBeginPath(ctx)
    cg.CGContextAddEllipseInRect(ctx, rect(13, 13, 94, 94))
    cg.CGContextClip(ctx)

    cg.CGContextBeginPath(ctx)
    wx = -8.0
    cg.CGContextMoveToPoint(ctx, wx, 86.0)
    for i in range(10):
        cy = 78.0 if i % 2 == 0 else 94.0
        cg.CGContextAddQuadCurveToPoint(ctx, wx + 10.0, cy, wx + 20.0, 86.0)
        wx += 20.0
    cg.CGContextSetRGBStrokeColor(ctx, *ink)
    cg.CGContextSetLineWidth(ctx, 4.5)
    cg.CGContextSetLineCap(ctx, 1)  # kCGLineCapRound
    cg.CGContextSetLineJoin(ctx, 1)  # kCGLineJoinRound
    cg.CGContextStrokePath(ctx)
    cg.CGContextRestoreGState(ctx)

    cg.CGContextRestoreGState(ctx)


def draw_text(ctx, cs, text: str, x: float, y: float, font_name: str, size: float, rgba: tuple[float, float, float, float]) -> None:
    cf_font = cf.CFStringCreateWithCString(None, font_name.encode("utf-8"), kCFStringEncodingUTF8)
    font = ct.CTFontCreateWithName(cf_font, size, None)
    comps = (CGFloat * 4)(*rgba)
    color = cg.CGColorCreate(cs, comps)
    keys = (c_void_p * 2)(kCTFontAttributeName, kCTForegroundColorAttributeName)
    vals = (c_void_p * 2)(font, color)
    attrs = cf.CFDictionaryCreate(
        None, keys, vals, 2,
        ctypes.byref(kCFTypeDictionaryKeyCallBacks),
        ctypes.byref(kCFTypeDictionaryValueCallBacks),
    )
    cf_text = cf.CFStringCreateWithCString(None, text.encode("utf-8"), kCFStringEncodingUTF8)
    attr_str = cf.CFAttributedStringCreate(None, cf_text, attrs)
    line = ct.CTLineCreateWithAttributedString(attr_str)

    cg.CGContextSaveGState(ctx)
    cg.CGContextSetTextMatrix(ctx, CGAffineTransform(1, 0, 0, 1, 0, 0))
    cg.CGContextSetTextPosition(ctx, x, y)
    ct.CTLineDraw(line, ctx)
    cg.CGContextRestoreGState(ctx)

    cf.CFRelease(line)
    cf.CFRelease(attr_str)
    cf.CFRelease(cf_text)
    cf.CFRelease(attrs)
    cg.CGColorRelease(color)
    cf.CFRelease(font)
    cf.CFRelease(cf_font)


def encode_png(width: int, height: int, premul_rgba: bytearray) -> bytes:
    """Encode premultiplied RGBA bitmap buffer to a standard straight-alpha PNG."""
    raw = bytearray()
    stride = width * 4
    for row in range(height):
        raw.append(0)  # filter type 0 (None)
        start = row * stride
        for col in range(0, stride, 4):
            r = premul_rgba[start + col]
            g = premul_rgba[start + col + 1]
            b = premul_rgba[start + col + 2]
            a = premul_rgba[start + col + 3]
            if 0 < a < 255:
                r = min(255, (r * 255 + a // 2) // a)
                g = min(255, (g * 255 + a // 2) // a)
                b = min(255, (b * 255 + a // 2) // a)
            raw.extend((r, g, b, a))

    def chunk(tag: bytes, payload: bytes) -> bytes:
        crc = zlib.crc32(tag + payload) & 0xFFFFFFFF
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), level=9)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def render_png(width: int, height: int, draw_fn) -> bytes:
    buf = (ctypes.c_ubyte * (width * height * 4))()
    cs = cg.CGColorSpaceCreateDeviceRGB()
    ctx = cg.CGBitmapContextCreate(buf, width, height, 8, width * 4, cs, 1)
    cg.CGContextSetAllowsAntialiasing(ctx, True)
    cg.CGContextSetShouldAntialias(ctx, True)
    try:
        draw_fn(ctx, cs)
    finally:
        cg.CGContextRelease(ctx)
        cg.CGColorSpaceRelease(cs)
    return encode_png(width, height, bytearray(buf))


def write_ico(frames: list[tuple[int, bytes]], path: pathlib.Path) -> None:
    header = bytearray(struct.pack("<HHH", 0, 1, len(frames)))
    offset = 6 + 16 * len(frames)
    for size, data in frames:
        dim = 0 if size >= 256 else size
        header.extend(struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(data), offset))
        offset += len(data)
    out = bytes(header) + b"".join(data for _, data in frames)
    path.write_bytes(out)


def main() -> None:
    public_dir = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "frontend/public")
    public_dir.mkdir(parents=True, exist_ok=True)

    # 1. Transparent favicons & PWA icons
    for size, name in [
        (16, "favicon-16x16.png"),
        (32, "favicon-32x32.png"),
        (192, "android-chrome-192x192.png"),
        (512, "android-chrome-512x512.png"),
    ]:
        data = render_png(size, size, lambda ctx, cs, s=size: draw_matsya_mark(ctx, 0, 0, s, dark=False))
        (public_dir / name).write_bytes(data)

    # 2. Multi-size favicon.ico (16, 32, 48)
    ico_frames = [
        (size, render_png(size, size, lambda ctx, cs, s=size: draw_matsya_mark(ctx, 0, 0, s, dark=False)))
        for size in (16, 32, 48)
    ]
    write_ico(ico_frames, public_dir / "favicon.ico")

    # 3. Apple touch icon (180x180, light brand background)
    def draw_apple(ctx, cs):
        cg.CGContextSetRGBFillColor(ctx, *BG_LIGHT)
        cg.CGContextFillRect(ctx, rect(0, 0, 180, 180))
        draw_matsya_mark(ctx, 16, 16, 148, dark=False)

    (public_dir / "apple-touch-icon.png").write_bytes(render_png(180, 180, draw_apple))

    # 4. Maskable 512x512 icon with safe-zone padding (~66% mark centered on #F2FAF8)
    def draw_maskable(ctx, cs):
        cg.CGContextSetRGBFillColor(ctx, *BG_LIGHT)
        cg.CGContextFillRect(ctx, rect(0, 0, 512, 512))
        mark = 336.0
        inset = (512.0 - mark) / 2.0
        draw_matsya_mark(ctx, inset, inset, mark, dark=False)

    (public_dir / "icon-maskable-512x512.png").write_bytes(render_png(512, 512, draw_maskable))

    # 5. Open Graph image (1200x630)
    def draw_og(ctx, cs):
        cg.CGContextSetRGBFillColor(ctx, *BG_DARK)
        cg.CGContextFillRect(ctx, rect(0, 0, 1200, 630))

        # Radial glows
        teal_grad = cg.CGGradientCreateWithColorComponents(
            cs, (CGFloat * 8)(TEAL[0], TEAL[1], TEAL[2], 0.22, TEAL[0], TEAL[1], TEAL[2], 0.0),
            (CGFloat * 2)(0.0, 1.0), 2,
        )
        cg.CGContextDrawRadialGradient(ctx, teal_grad, CGPoint(270, 315), 20, CGPoint(270, 315), 340, 0)
        cg.CGGradientRelease(teal_grad)

        blue_grad = cg.CGGradientCreateWithColorComponents(
            cs, (CGFloat * 8)(BLUE[0], BLUE[1], BLUE[2], 0.14, BLUE[0], BLUE[1], BLUE[2], 0.0),
            (CGFloat * 2)(0.0, 1.0), 2,
        )
        cg.CGContextDrawRadialGradient(ctx, blue_grad, CGPoint(1020, 490), 10, CGPoint(1020, 490), 320, 0)
        cg.CGGradientRelease(blue_grad)

        # Card frame
        add_rounded_rect(ctx, 56, 56, 1088, 518, 32)
        cg.CGContextSetRGBFillColor(ctx, TILE_DARK[0], TILE_DARK[1], TILE_DARK[2], 0.88)
        cg.CGContextFillPath(ctx)
        add_rounded_rect(ctx, 56, 56, 1088, 518, 32)
        cg.CGContextSetRGBStrokeColor(ctx, TEAL[0], TEAL[1], TEAL[2], 0.30)
        cg.CGContextSetLineWidth(ctx, 2.0)
        cg.CGContextStrokePath(ctx)

        # Rounded-square logo tile on left
        add_rounded_rect(ctx, 120, 185, 260, 260, 52)
        cg.CGContextSetRGBFillColor(ctx, *TILE_DARK)
        cg.CGContextFillPath(ctx)
        add_rounded_rect(ctx, 120, 185, 260, 260, 52)
        cg.CGContextSetRGBStrokeColor(ctx, TEAL[0], TEAL[1], TEAL[2], 0.45)
        cg.CGContextSetLineWidth(ctx, 2.5)
        cg.CGContextStrokePath(ctx)
        draw_matsya_mark(ctx, 152, 217, 196, dark=True)

        # Brand wordmark & subtitle
        draw_text(ctx, cs, "Matsya", 435, 362, "HelveticaNeue-Bold", 88.0, TEAL)
        draw_text(ctx, cs, "powered by ORCA", 439, 316, "HelveticaNeue-Medium", 24.0, (INK_DARK[0], INK_DARK[1], INK_DARK[2], 0.75))

        # Teal -> blue gradient bar
        cg.CGContextSaveGState(ctx)
        add_rounded_rect(ctx, 438, 280, 300, 8, 4)
        cg.CGContextClip(ctx)
        bar_grad = cg.CGGradientCreateWithColorComponents(
            cs, (CGFloat * 8)(*TEAL, *BLUE), (CGFloat * 2)(0.0, 1.0), 2,
        )
        cg.CGContextDrawLinearGradient(ctx, bar_grad, CGPoint(438, 284), CGPoint(738, 284), 0)
        cg.CGGradientRelease(bar_grad)
        cg.CGContextRestoreGState(ctx)

        draw_text(ctx, cs, "Coastal Safety & Marine Decision Support", 438, 222, "HelveticaNeue", 27.0, INK_DARK)
        draw_text(ctx, cs, "for India's Fishing Communities", 438, 184, "HelveticaNeue", 27.0, (INK_DARK[0], INK_DARK[1], INK_DARK[2], 0.85))
        draw_text(ctx, cs, "7,516 KM COASTLINE  ·  11 INDIAN LANGUAGES  ·  INCOIS + IMBL", 438, 122, "HelveticaNeue-Medium", 17.5, (TEAL[0], TEAL[1], TEAL[2], 0.92))

    (public_dir / "og-image.png").write_bytes(render_png(1200, 630, draw_og))
    print(f"Generated Matsya icon set and OG image in {public_dir}")


if __name__ == "__main__":
    main()
