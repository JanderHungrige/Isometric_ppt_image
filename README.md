
# Isometric Images

![Isometric 3D View Preview](images/preview.png)

Isometric Images turns screenshots, app views, diagrams, and slides into polished isometric PNG mockups with transparent backgrounds. It can run as a local web app or as the packaged macOS application in `release/`.

The original Figma project is available at https://www.figma.com/design/XgbcjpwmDseklXUYunNj61/Create-Isometric-3D-View.

## Quick Start

1. Open `release/Isometric Images.app`, or run the web version with `npm run dev`.
2. Drag an image onto the canvas, or click **Upload Image**.
3. Choose the image ratio and 3D angle.
4. Click **Save PNG** to export a cropped transparent PNG.

## Controls

### Upload Image

Loads a new image from your computer. You can also drag and drop an image directly onto the canvas.

### Ratio

Controls the card shape before it is tilted.

- **Auto** keeps the uploaded image's original aspect ratio.
- **16:9**, **4:3**, **1:1**, and **3:2** force common output shapes.

### Save Size

Locks the current card height so later uploaded images use the same visual size. This is useful when exporting multiple images for a slide deck and you want them to align cleanly.

Click it again to unlock the size.

### Compare

Freezes the current image as a semi-transparent overlay. After turning Compare on, upload another image to check whether the new image matches the previous one. The slider adjusts the overlay opacity.

### 3D: rotX and rotZ

Adjusts the tilt.

- **rotX** controls how much the image leans backward.
- **rotZ** rotates the image around the canvas.
- **reset** restores the default angle.

### Parallel / Perspective

Controls the projection algorithm.

- **Parallel** is best for PowerPoint, diagrams, and sets of images that need to align. Opposite edges stay parallel, so stacked exports do not look distorted.
- **Perspective** adds a cinematic vanishing-point effect. It looks more dramatic, but opposite edges can converge slightly.

### BG

Changes the preview background. The exported PNG is transparent; this background is mostly for judging contrast while you work.

### Custom

Opens two color pickers for a custom preview background gradient.

### Depth

Controls the card edge and shadow.

- The color picker sets the depth/shadow color.
- The slider changes how thick and strong the layered depth effect appears.

### Info

Opens the in-app help panel.

### Save PNG

Exports the current mockup as a transparent PNG. During export, animation is frozen and the output is cropped to the visible image with a small amount of padding.

## Recommended PowerPoint Workflow

Use **Parallel** projection when creating multiple images for a presentation. Set the desired angle, click **Save Size**, then export each image with the same settings. This keeps the edges parallel and makes the images easier to align in PowerPoint.

## macOS App

The packaged app is created at:

```text
release/Isometric Images.app
```

The shareable zip is created at:

```text
release/Isometric Images.app.zip
```

The app is ad-hoc signed for local use. If another Mac blocks it the first time, right-click the app and choose **Open**.

To rebuild the app:

```bash
bash scripts/package-macos.sh
```

## Development

Install dependencies:

```bash
npm i
```

Start the development server:

```bash
npm run dev
```
