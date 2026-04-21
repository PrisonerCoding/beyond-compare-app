import EXIF from 'exif-js'

export interface Stats {
  width: number
  height: number
  fileSize: number
  format: string
  avgColor?: { r: number; g: number; b: number }
  avgBrightness?: number
  exif?: ExifData
}

export interface ExifData {
  make?: string
  model?: string
  dateTime?: string
  exposureTime?: string
  fNumber?: string
  iso?: number
  focalLength?: string
  gpsLatitude?: string
  gpsLongitude?: string
  orientation?: number
}

export interface DiffStats {
  totalPixels: number
  diffPixels: number
  diffPercent: number
  maxDiff: number
  avgDiff: number
}

/**
 * Analyze image and compute statistics
 */
export async function analyzeImage(
  imageData: string,
  fileSize: number
): Promise<Stats> {
  const img = new Image()

  return new Promise((resolve) => {
    img.onload = () => {
      const stats: Stats = {
        width: img.width,
        height: img.height,
        fileSize,
        format: getFormatFromDataUrl(imageData),
      }

      // Compute average color and brightness
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx.drawImage(img, 0, 0)

        // Sample image data (use smaller sample for performance)
        const sampleWidth = Math.min(img.width, 100)
        const sampleHeight = Math.min(img.height, 100)
        const sampleData = ctx.getImageData(
          Math.floor((img.width - sampleWidth) / 2),
          Math.floor((img.height - sampleHeight) / 2),
          sampleWidth,
          sampleHeight
        )

        // Compute average color
        let totalR = 0, totalG = 0, totalB = 0
        let pixelCount = sampleData.data.length / 4

        for (let i = 0; i < sampleData.data.length; i += 4) {
          totalR += sampleData.data[i]
          totalG += sampleData.data[i + 1]
          totalB += sampleData.data[i + 2]
        }

        stats.avgColor = {
          r: Math.round(totalR / pixelCount),
          g: Math.round(totalG / pixelCount),
          b: Math.round(totalB / pixelCount),
        }

        // Compute average brightness (0-100%)
        stats.avgBrightness = (totalR + totalG + totalB) / (pixelCount * 3) / 255 * 100
      }

      // Try to read EXIF data
      try {
        const exifData = readExifData(img)
        if (exifData) {
          stats.exif = exifData
        }
      } catch (e) {
        console.warn('Could not read EXIF data:', e)
      }

      resolve(stats)
    }

    img.onerror = () => {
      resolve({
        width: 0,
        height: 0,
        fileSize,
        format: 'unknown',
      })
    }

    img.src = imageData
  })
}

/**
 * Get format from data URL
 */
function getFormatFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/([^;]+);/)
  return match ? match[1] : 'unknown'
}

/**
 * Read EXIF data from image
 */
function readExifData(img: HTMLImageElement): ExifData | null {
  try {
    // @ts-ignore - exif-js types are incomplete
    const allTags = EXIF.getAllTags(img)
    if (!allTags) return null

    return {
      make: allTags.Make,
      model: allTags.Model,
      dateTime: allTags.DateTime,
      exposureTime: allTags.ExposureTime?.toString(),
      fNumber: allTags.FNumber?.toString(),
      iso: allTags.ISOSpeedRatings,
      focalLength: allTags.FocalLength?.toString(),
      gpsLatitude: allTags.GPSLatitude?.toString(),
      gpsLongitude: allTags.GPSLongitude?.toString(),
      orientation: allTags.Orientation,
    }
  } catch (e) {
    return null
  }
}

/**
 * Compute pixel difference statistics
 */
export function computeDiffStats(
  leftData: Uint8ClampedArray,
  rightData: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 10
): DiffStats {
  const totalPixels = width * height
  let diffPixels = 0
  let maxDiff = 0
  let totalDiff = 0

  for (let i = 0; i < leftData.length; i += 4) {
    const rDiff = Math.abs(leftData[i] - rightData[i])
    const gDiff = Math.abs(leftData[i + 1] - rightData[i + 1])
    const bDiff = Math.abs(leftData[i + 2] - rightData[i + 2])

    const pixelDiff = Math.max(rDiff, gDiff, bDiff)
    totalDiff += pixelDiff

    if (pixelDiff > maxDiff) {
      maxDiff = pixelDiff
    }

    if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
      diffPixels++
    }
  }

  return {
    totalPixels,
    diffPixels,
    diffPercent: (diffPixels / totalPixels) * 100,
    maxDiff,
    avgDiff: totalDiff / totalPixels,
  }
}