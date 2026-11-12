# Avatar parts

Drop your drawings here (transparent PNG, SVG or WebP). Use one folder per layer.
The number in front of the folder name sets the stacking order, lowest at the bottom:

```
public/avatars/
  01-face/round.png        <- base layer, always shown
  01-face/oval.png
  02-hair/waves.png
  02-hair/bob.png
  03-eyes/sleepy.png
  04-accessory/bow.svg
```

- Every layer is always shown, except layers named `accessory` (or `extra` / `optional`),
  which also get a "none" choice.
- Draw every part on the **same canvas size** (square works best, e.g. 600×600) and
  in the right position, so the layers line up when stacked.
- File names become the option names (`big-curls.png` shows as "big curls"). A number in front
  (`1-long.webp`) only sets the order; the first option is the default.
- In development, new files appear after a page refresh. Production picks them up on the next deploy.
- If a layer is called `hair`, its options are also offered on the sign-up form.

Until any drawings are here, the app uses the built-in hand-drawn SVG avatar.

The current parts are 600×600 transparent WebP in cobalt ink, all on the same canvas.
