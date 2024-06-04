// import './App.css';
// App.tsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './App.module.css';
import { loadImage, SaveCanvas, basename, extname } from './utils/net';
import { generate as generateBayer } from './bayer';
import Slider from './components/slider';
import {
  clamp,
  rgb2yuv,
  yuv2rgb,
  rgbDistance,
  gammaIn,
  gammaOut,
} from './utils/color';
import { IndexedColor, PackedYUV, diffusions } from './utils/dither';

const WIDTH = 400;
const HEIGHT = 240;

const App: React.FC = () => {
  const [ditherInput, setDitherInput] = useState('Atkinson');
  const [zoom, setZoom] = useState(2);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [outputData, setOutputData] = useState<ImageData | null>(null);
  const [width, setWidth] = useState(WIDTH);
  const [height, setHeight] = useState(HEIGHT);
  const [autoHeight, setAutoHeight] = useState(true);
  const [gamma, setGamma] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [luminance, setLuminance] = useState(true);
  const [weightRed, setWeightRed] = useState(0.299);
  const [weightGreen, setWeightGreen] = useState(0.587);
  const [weightBlue, setWeightBlue] = useState(0.114);
  const [normalize, setNormalize] = useState(false);
  const [bayerSize, setBayerSize] = useState(2);
  const [bayerScale, setBayerScale] = useState(0);
  const [simulate, setSimulate] = useState(false);
  const [transparency, setTransparency] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // const loadInitialImage = async () => {
    //   const img = await loadImage('./assets/start-image.png');
    //   setImageData(getImageData(img));
    // };
    // loadInitialImage();
  }, []);

  useEffect(() => {
    if (autoHeight) {
      setHeight(
        Math.floor((width * (imageData?.height || 0)) / (imageData?.width || 1))
      );
    }
  }, [width, autoHeight, imageData]);

  useEffect(() => {
    draw();
  }, [
    imageData,
    width,
    height,
    gamma,
    brightness,
    contrast,
    luminance,
    weightRed,
    weightGreen,
    weightBlue,
    normalize,
    ditherInput,
    bayerSize,
    bayerScale,
    simulate,
    transparency,
  ]);

  const getImageData = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, img.width, img.height);
    return ctx?.getImageData(0, 0, img.width, img.height);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = await loadImage(URL.createObjectURL(file));
      debugger;
      setImageData(getImageData(img));
      if (saveLink.current) {
        saveLink.current.download = `${basename(file.name)}-dithered.png`;
      }
    }
  };

  const draw = () => {
    if (!canvasRef.current || !imageData || !outputData) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const input = new ImageData(imageData.width, imageData.height);
    input.data.set(imageData.data);
    const grayscale = new Float32Array(imageData.width * imageData.height);
    ctx.clearRect(0, 0, width, height);

    const dither = !!ditherInput;
    const algo = new IndexedColor([
      [0, 0, 0],
      [255, 255, 255],
    ]);
    const row = width * 4;
    const bayerTable = generateBayer(Math.pow(2, bayerSize));
    const bayerMax = Math.pow(2, bayerSize) - 1;
    const bayerScaleValue = bayerScale * (255 / bayerMax);
    const preserveTransparency = transparency;

    const weights = {
      r: luminance ? 0.299 : weightRed,
      g: luminance ? 0.587 : weightGreen,
      b: luminance ? 0.114 : weightBlue,
    };
    const totalWeight = normalize ? weights.r + weights.g + weights.b : 1;

    let errorScale, errorDiffusion;
    if (dither) {
      ({ errorScale, errorDiffusion } = diffusions[ditherInput]);
    }

    for (let i = 0; i < grayscale.length; i++) {
      const idx = i * 4;
      const ir = clamp(0, 255, input.data[idx]);
      const ig = clamp(0, 255, input.data[idx + 1]);
      const ib = clamp(0, 255, input.data[idx + 2]);
      const lum =
        (ir * weights.r + ig * weights.g + ib * weights.b) / totalWeight;
      grayscale[i] = (gammaIn(lum) - 128) * contrast + 128 + brightness * 255;
    }

    for (let i = 0; i < grayscale.length; i++) {
      const idx = i * 4;
      const x = i % width;
      const y = Math.floor(i / width);
      const bd =
        (bayerTable[
          (x % bayerTable.length) + (y % bayerTable.length) * bayerTable.length
        ] -
          bayerMax / 2) *
        bayerScaleValue;
      const lum = grayscale[i] + bd;
      const c = lum > 128 ? 255 : 0;
      outputData.data[idx] = c;
      outputData.data[idx + 1] = c;
      outputData.data[idx + 2] = c;
      outputData.data[idx + 3] = preserveTransparency
        ? input.data[idx + 3]
        : 255;

      if (dither) {
        const err = lum - c;
        for (const [dx, dy, di] of errorDiffusion) {
          const px = x + dx;
          const py = y + dy;
          const pidx = px + py * width;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            grayscale[pidx] += err * (di / errorScale);
          }
        }
      }
    }

    ctx.putImageData(outputData, 0, 0);

    const save = new SaveCanvas(500);
    save.requestSave({ canvas: canvasRef.current, link: saveLink.current });

    if (simulate) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighten';
      ctx.fillStyle = '#323027';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'darken';
      ctx.fillStyle = '#b4b2ac';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  return (
    <div className={styles.app}>
      <div className={styles.form}>
        <form>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button onClick={() => fileInputRef.current?.click()}>
            Select Image...
          </button>
          <details open>
            <summary>
              <h2>Adjust</h2>
            </summary>
            <Slider
              label="exposure"
              name="gamma"
              min={0.5}
              max={2.5}
              step={0.01}
              value={gamma}
              onChange={(value) => setGamma(value)}
            />
            <Slider
              label="brightness"
              name="brightness"
              min={-1}
              max={1}
              step={0.01}
              value={brightness}
              format={(n) => {
                const value = parseFloat(n);
                return (value >= 0 ? '+' : '') + Math.round(value * 100) + '%';
              }}
              onChange={(value) => setBrightness(value)}
            />
            <Slider
              label="contrast"
              name="contrast"
              min={0}
              max={2}
              step={0.01}
              value={contrast}
              format={(n) => Math.round(parseFloat(n) * 100) + '%'}
              onChange={(value) => setContrast(value)}
            />
          </details>
          <details>
            <summary>
              <h2>Grayscale</h2>
            </summary>
            <label className={styles.formRow}>
              use luminance
              <input
                name="luminance"
                type="checkbox"
                checked={luminance}
                onChange={(e) => setLuminance(e.target.checked)}
              />
            </label>
            <Slider
              label="red"
              name="weightRed"
              min={0}
              max={2}
              step={0.01}
              value={weightRed}
              onChange={(value) => setWeightRed(value)}
              disabled={luminance}
            />
            <Slider
              label="green"
              name="weightGreen"
              min={0}
              max={2}
              step={0.01}
              value={weightGreen}
              onChange={(value) => setWeightGreen(value)}
              disabled={luminance}
            />
            <Slider
              label="blue"
              name="weightBlue"
              min={0}
              max={2}
              step={0.01}
              value={weightBlue}
              onChange={(value) => setWeightBlue(value)}
              disabled={luminance}
            />
            <label className={styles.formRow}>
              normalize
              <input
                name="normalize"
                type="checkbox"
                checked={normalize}
                onChange={(e) => setNormalize(e.target.checked)}
                disabled={luminance}
              />
            </label>
          </details>
          <details open>
            <summary>
              <h2>Dither</h2>
            </summary>
            <label className={styles.formRow}>
              dither
              <select
                name="dither"
                value={ditherInput}
                onChange={(e) => setDitherInput(e.target.value)}
              >
                <option value="">None (Bayer Only)</option>
                {Object.keys(diffusions).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </details>
          <details>
            <summary>
              <h2>Bayer</h2>
            </summary>
            <Slider
              label="size"
              name="bayerSize"
              min={1}
              max={5}
              step={1}
              value={bayerSize}
              format={(v) => Math.pow(2, parseInt(v))}
              onChange={(value) => setBayerSize(value)}
            />
            <Slider
              label="amount"
              name="bayerScale"
              min={0}
              max={2}
              step={0.01}
              value={bayerScale}
              onChange={(value) => setBayerScale(value)}
            />
          </details>
          <details open>
            <summary>
              <h2>Output</h2>
            </summary>
            <label className={styles.formRow}>
              simulate display
              <input
                name="simulate"
                type="checkbox"
                checked={simulate}
                onChange={(e) => setSimulate(e.target.checked)}
              />
            </label>
            <label className={styles.formRow}>
              preserve transparency
              <input
                name="transparency"
                type="checkbox"
                checked={transparency}
                onChange={(e) => setTransparency(e.target.checked)}
              />
            </label>
            <Slider
              label="zoom"
              name="zoom"
              min={1}
              max={4}
              step={0.25}
              value={zoom}
              format={(v) => parseFloat(v) * 100 + '%'}
              onChange={(value) => setZoom(value)}
            />
            <label className={styles.formRow}>
              width
              <input
                name="width"
                type="number"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
              />
            </label>
            <label className={styles.formRow}>
              auto height
              <input
                name="autoHeight"
                type="checkbox"
                checked={autoHeight}
                onChange={(e) => setAutoHeight(e.target.checked)}
              />
            </label>
            <label className={styles.formRow}>
              height
              <input
                name="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                disabled={autoHeight}
              />
            </label>
          </details>
          <a
            ref={saveLink}
            className={`${styles.save} ${styles.button}`}
            download="dithered.png"
          >
            Download dithered image ⬇️
          </a>
        </form>
      </div>
      <div className={styles.output}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ imageRendering: 'crisp-edges', width: `${width * zoom}px` }}
        />
      </div>
    </div>
  );
};

export default App;
