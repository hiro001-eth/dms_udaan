import sharp from "sharp";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import archiver from "archiver";
import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads");
const processedDir = path.join(process.cwd(), "processed");

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

function generateUniqueFilename(baseName: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${baseName}-${timestamp}-${random}${extension}`;
}

export async function imageToPdf(imagePath: string, outputName?: string): Promise<string> {
  const imageBuffer = await fs.promises.readFile(imagePath);
  const metadata = await sharp(imageBuffer).metadata();
  
  const pdfDoc = await PDFDocument.create();
  const width = metadata.width || 595;
  const height = metadata.height || 842;
  
  const page = pdfDoc.addPage([width, height]);
  
  let image;
  const format = metadata.format?.toLowerCase();
  
  if (format === "jpeg" || format === "jpg") {
    image = await pdfDoc.embedJpg(imageBuffer);
  } else {
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();
    image = await pdfDoc.embedPng(pngBuffer);
  }
  
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: width,
    height: height,
  });
  
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(processedDir, generateUniqueFilename(outputName || "converted", ".pdf"));
  await fs.promises.writeFile(outputPath, pdfBytes);
  
  return outputPath;
}

export async function pdfToImage(pdfPath: string, pageNumber: number = 0): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const page = pdfDoc.getPage(pageNumber);
  const { width, height } = page.getSize();
  
  const singlePagePdf = await PDFDocument.create();
  const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNumber]);
  singlePagePdf.addPage(copiedPage);
  
  const singlePageBytes = await singlePagePdf.save();
  const tempPdfPath = path.join(processedDir, generateUniqueFilename("temp", ".pdf"));
  await fs.promises.writeFile(tempPdfPath, singlePageBytes);
  
  const outputPath = path.join(processedDir, generateUniqueFilename("page", ".png"));
  
  await sharp(singlePageBytes, { density: 150 })
    .png()
    .toFile(outputPath);
  
  await fs.promises.unlink(tempPdfPath).catch(() => {});
  
  return outputPath;
}

export async function mergePdfs(pdfPaths: string[], outputName?: string): Promise<string> {
  const mergedPdf = await PDFDocument.create();
  
  for (const pdfPath of pdfPaths) {
    const pdfBytes = await fs.promises.readFile(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pageCount = pdf.getPageCount();
    
    const copiedPages = await mergedPdf.copyPages(pdf, Array.from({ length: pageCount }, (_, i) => i));
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }
  
  const mergedBytes = await mergedPdf.save();
  const outputPath = path.join(processedDir, generateUniqueFilename(outputName || "merged", ".pdf"));
  await fs.promises.writeFile(outputPath, mergedBytes);
  
  return outputPath;
}

export async function splitPdf(pdfPath: string, pageRanges: { start: number; end: number }[]): Promise<string[]> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdf = await PDFDocument.load(pdfBytes);
  const outputPaths: string[] = [];
  
  for (let i = 0; i < pageRanges.length; i++) {
    const { start, end } = pageRanges[i];
    const newPdf = await PDFDocument.create();
    
    const pageIndices = Array.from({ length: end - start + 1 }, (_, idx) => start + idx - 1);
    const validIndices = pageIndices.filter(idx => idx >= 0 && idx < pdf.getPageCount());
    
    const copiedPages = await newPdf.copyPages(pdf, validIndices);
    copiedPages.forEach(page => newPdf.addPage(page));
    
    const splitBytes = await newPdf.save();
    const outputPath = path.join(processedDir, generateUniqueFilename(`split-${i + 1}`, ".pdf"));
    await fs.promises.writeFile(outputPath, splitBytes);
    outputPaths.push(outputPath);
  }
  
  return outputPaths;
}

export async function extractPages(pdfPath: string, pageNumbers: number[]): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  
  const validIndices = pageNumbers
    .map(n => n - 1)
    .filter(idx => idx >= 0 && idx < pdf.getPageCount());
  
  const copiedPages = await newPdf.copyPages(pdf, validIndices);
  copiedPages.forEach(page => newPdf.addPage(page));
  
  const extractedBytes = await newPdf.save();
  const outputPath = path.join(processedDir, generateUniqueFilename("extracted", ".pdf"));
  await fs.promises.writeFile(outputPath, extractedBytes);
  
  return outputPath;
}

export async function compressImage(imagePath: string, quality: number = 80): Promise<string> {
  const metadata = await sharp(imagePath).metadata();
  const format = metadata.format?.toLowerCase() || "jpeg";
  
  let outputBuffer: Buffer;
  const ext = format === "png" ? ".png" : ".jpg";
  
  if (format === "png") {
    outputBuffer = await sharp(imagePath)
      .png({ compressionLevel: 9, quality })
      .toBuffer();
  } else {
    outputBuffer = await sharp(imagePath)
      .jpeg({ quality })
      .toBuffer();
  }
  
  const outputPath = path.join(processedDir, generateUniqueFilename("compressed", ext));
  await fs.promises.writeFile(outputPath, outputBuffer);
  
  return outputPath;
}

export async function resizeImage(imagePath: string, width: number, height?: number): Promise<string> {
  const metadata = await sharp(imagePath).metadata();
  const format = metadata.format?.toLowerCase() || "jpeg";
  const ext = format === "png" ? ".png" : ".jpg";
  
  const resized = await sharp(imagePath)
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .toBuffer();
  
  const outputPath = path.join(processedDir, generateUniqueFilename("resized", ext));
  await fs.promises.writeFile(outputPath, resized);
  
  return outputPath;
}

export async function convertImageFormat(imagePath: string, targetFormat: "jpeg" | "png" | "webp"): Promise<string> {
  const extensions = { jpeg: ".jpg", png: ".png", webp: ".webp" };
  
  let outputBuffer: Buffer;
  
  switch (targetFormat) {
    case "jpeg":
      outputBuffer = await sharp(imagePath).jpeg({ quality: 90 }).toBuffer();
      break;
    case "png":
      outputBuffer = await sharp(imagePath).png().toBuffer();
      break;
    case "webp":
      outputBuffer = await sharp(imagePath).webp({ quality: 90 }).toBuffer();
      break;
  }
  
  const outputPath = path.join(processedDir, generateUniqueFilename("converted", extensions[targetFormat]));
  await fs.promises.writeFile(outputPath, outputBuffer);
  
  return outputPath;
}

export async function rotatePdf(pdfPath: string, rotationDegrees: number): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages();
  pages.forEach(page => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + rotationDegrees));
  });
  
  const rotatedBytes = await pdfDoc.save();
  const outputPath = path.join(processedDir, generateUniqueFilename("rotated", ".pdf"));
  await fs.promises.writeFile(outputPath, rotatedBytes);
  
  return outputPath;
}

export async function addWatermark(pdfPath: string, watermarkText: string): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const pages = pdfDoc.getPages();
  pages.forEach(page => {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) / 10;
    
    page.drawText(watermarkText, {
      x: width / 4,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.75, 0.75, 0.75),
      opacity: 0.3,
      rotate: { type: "degrees", angle: -45 } as any,
    });
  });
  
  const watermarkedBytes = await pdfDoc.save();
  const outputPath = path.join(processedDir, generateUniqueFilename("watermarked", ".pdf"));
  await fs.promises.writeFile(outputPath, watermarkedBytes);
  
  return outputPath;
}

export async function createZipArchive(filePaths: string[], outputName?: string): Promise<string> {
  const outputPath = path.join(processedDir, generateUniqueFilename(outputName || "archive", ".zip"));
  const output = fs.createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  
  return new Promise((resolve, reject) => {
    output.on("close", () => resolve(outputPath));
    archive.on("error", reject);
    
    archive.pipe(output);
    
    filePaths.forEach(filePath => {
      const fileName = path.basename(filePath);
      archive.file(filePath, { name: fileName });
    });
    
    archive.finalize();
  });
}

export async function imagesToPdf(imagePaths: string[], outputName?: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  
  for (const imagePath of imagePaths) {
    const imageBuffer = await fs.promises.readFile(imagePath);
    const metadata = await sharp(imageBuffer).metadata();
    
    const width = metadata.width || 595;
    const height = metadata.height || 842;
    
    const page = pdfDoc.addPage([width, height]);
    
    let image;
    const format = metadata.format?.toLowerCase();
    
    if (format === "jpeg" || format === "jpg") {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else {
      const pngBuffer = await sharp(imageBuffer).png().toBuffer();
      image = await pdfDoc.embedPng(pngBuffer);
    }
    
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(processedDir, generateUniqueFilename(outputName || "images-combined", ".pdf"));
  await fs.promises.writeFile(outputPath, pdfBytes);
  
  return outputPath;
}

export function getProcessedDir(): string {
  return processedDir;
}

export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

export async function deletePages(pdfPath: string, pagesToDelete: number[]): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  
  const totalPages = pdfDoc.getPageCount();
  const deleteIndices = new Set(pagesToDelete.map(n => n - 1));
  const keepIndices = Array.from({ length: totalPages }, (_, i) => i)
    .filter(idx => !deleteIndices.has(idx));
  
  const copiedPages = await newPdf.copyPages(pdfDoc, keepIndices);
  copiedPages.forEach(page => newPdf.addPage(page));
  
  const resultBytes = await newPdf.save();
  const outputPath = path.join(processedDir, generateUniqueFilename("pages-deleted", ".pdf"));
  await fs.promises.writeFile(outputPath, resultBytes);
  
  return outputPath;
}

export async function addPageNumbers(
  pdfPath: string, 
  position: "top" | "bottom" = "bottom",
  format: string = "Page {n} of {total}"
): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const pages = pdfDoc.getPages();
  const total = pages.length;
  
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const pageNumber = index + 1;
    const text = format.replace("{n}", String(pageNumber)).replace("{total}", String(total));
    const textWidth = font.widthOfTextAtSize(text, 10);
    
    const x = (width - textWidth) / 2;
    const y = position === "bottom" ? 20 : height - 30;
    
    page.drawText(text, {
      x,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });
  
  const numberedBytes = await pdfDoc.save();
  const outputPath = path.join(processedDir, generateUniqueFilename("numbered", ".pdf"));
  await fs.promises.writeFile(outputPath, numberedBytes);
  
  return outputPath;
}

export async function reorderPages(pdfPath: string, newOrder: number[]): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  
  const pageIndices = newOrder.map(n => n - 1).filter(idx => idx >= 0 && idx < pdfDoc.getPageCount());
  const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
  copiedPages.forEach(page => newPdf.addPage(page));
  
  const reorderedBytes = await newPdf.save();
  const outputPath = path.join(processedDir, generateUniqueFilename("reordered", ".pdf"));
  await fs.promises.writeFile(outputPath, reorderedBytes);
  
  return outputPath;
}

export async function addHeaderFooter(
  pdfPath: string,
  header?: string,
  footer?: string
): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const pages = pdfDoc.getPages();
  
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    
    if (header) {
      const headerWidth = font.widthOfTextAtSize(header, 10);
      page.drawText(header, {
        x: (width - headerWidth) / 2,
        y: height - 25,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    
    if (footer) {
      const footerWidth = font.widthOfTextAtSize(footer, 10);
      page.drawText(footer, {
        x: (width - footerWidth) / 2,
        y: 20,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  });
  
  const resultBytes = await pdfDoc.save();
  const outputPath = path.join(processedDir, generateUniqueFilename("header-footer", ".pdf"));
  await fs.promises.writeFile(outputPath, resultBytes);
  
  return outputPath;
}

export async function protectPdf(pdfPath: string, userPassword?: string, ownerPassword?: string): Promise<string> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const protectedBytes = await pdfDoc.save();
  const outputPath = path.join(processedDir, generateUniqueFilename("protected", ".pdf"));
  await fs.promises.writeFile(outputPath, protectedBytes);
  
  return outputPath;
}

export async function cropImage(imagePath: string, left: number, top: number, width: number, height: number): Promise<string> {
  const metadata = await sharp(imagePath).metadata();
  const format = metadata.format?.toLowerCase() || "jpeg";
  const ext = format === "png" ? ".png" : ".jpg";
  
  const croppedBuffer = await sharp(imagePath)
    .extract({ left, top, width, height })
    .toBuffer();
  
  const outputPath = path.join(processedDir, generateUniqueFilename("cropped", ext));
  await fs.promises.writeFile(outputPath, croppedBuffer);
  
  return outputPath;
}

export async function rotateImage(imagePath: string, degrees: number): Promise<string> {
  const metadata = await sharp(imagePath).metadata();
  const format = metadata.format?.toLowerCase() || "jpeg";
  const ext = format === "png" ? ".png" : ".jpg";
  
  const rotatedBuffer = await sharp(imagePath)
    .rotate(degrees)
    .toBuffer();
  
  const outputPath = path.join(processedDir, generateUniqueFilename("rotated", ext));
  await fs.promises.writeFile(outputPath, rotatedBuffer);
  
  return outputPath;
}

export async function getPdfInfo(pdfPath: string): Promise<{ pageCount: number; pages: { width: number; height: number }[] }> {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages().map(page => {
    const { width, height } = page.getSize();
    return { width, height };
  });
  
  return {
    pageCount: pdfDoc.getPageCount(),
    pages,
  };
}
