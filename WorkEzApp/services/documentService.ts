import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import pako from 'pako';
import { apiRequest } from './api';

export interface PdfMetadataDto {
  title?: string | null;
  author?: string | null;
  subject?: string | null;
  keywords?: string | null;
  creator?: string | null;
  producer?: string | null;
  creationDate?: string | null;
  modifiedDate?: string | null;
  pageCount: number;
  customMetadata?: Record<string, string> | null;
  extractedTextLength?: number;
  extractedTextPreview?: string | null;
}

export interface DocumentValidationResultDto {
  isValid: boolean;
  extractedDocumentNumber?: string | null;
  expectedDocumentNumber: string;
  documentType: 'CPF' | 'CNPJ';
  metadata?: PdfMetadataDto | null;
  message: string;
}

export interface PickedPdfFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  file?: File;
}

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Máscara CPF: 000.000.000-00 */
export function applyCPFMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Máscara CNPJ: 00.000.000/0000-00 */
export function applyCNPJMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** Valida CPF com dígitos verificadores */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (d: string, len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(d[i], 10) * (len + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return (
    calcDigit(digits, 9) === parseInt(digits[9], 10) &&
    calcDigit(digits, 10) === parseInt(digits[10], 10)
  );
}

/** Valida CNPJ com dígitos verificadores */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(digits[i], 10) * weights1[i];
  }
  const rem1 = sum1 % 11;
  const digit1 = rem1 < 2 ? 0 : 11 - rem1;
  if (digit1 !== parseInt(digits[12], 10)) return false;

  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits[i], 10) * weights2[i];
  }
  const rem2 = sum2 % 11;
  const digit2 = rem2 < 2 ? 0 : 11 - rem2;
  return digit2 === parseInt(digits[13], 10);
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((len * 3) / 4) - pad;
  const bytes = new Uint8Array(byteLength);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = B64_CHARS.indexOf(clean.charAt(i));
    const enc2 = B64_CHARS.indexOf(clean.charAt(i + 1));
    const enc3 = clean.charAt(i + 2) === '=' ? 0 : B64_CHARS.indexOf(clean.charAt(i + 2));
    const enc4 = clean.charAt(i + 3) === '=' ? 0 : B64_CHARS.indexOf(clean.charAt(i + 3));

    const chunk = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;
    if (p < byteLength) bytes[p++] = (chunk >> 16) & 0xff;
    if (p < byteLength) bytes[p++] = (chunk >> 8) & 0xff;
    if (p < byteLength) bytes[p++] = chunk & 0xff;
  }

  return bytes;
}

function uint8ArrayToLatin1(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, Array.from(sub)));
  }
  return chunks.join('');
}

async function readPdfAsBase64AndBytes(pdf: PickedPdfFile): Promise<{ base64: string; bytes: Uint8Array } | null> {
  try {
    if (Platform.OS === 'web' && pdf.file) {
      const arrayBuf = await pdf.file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      const binary = uint8ArrayToLatin1(bytes);
      const base64 = typeof btoa === 'function' ? btoa(binary) : '';
      return { base64, bytes };
    }

    const res = await fetch(pdf.uri);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const commaIdx = dataUrl.indexOf(',');
    const rawBase64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const bytes = base64ToUint8Array(rawBase64);
    return { base64: rawBase64, bytes };
  } catch (err) {
    console.warn('[documentService] Falha ao ler bytes do PDF:', err);
    return null;
  }
}

function decodePdfLiteral(input: string): string {
  const unescaped = input
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');

  // UTF-16BE com BOM (\xFE\xFF)
  if (
    unescaped.length >= 2 &&
    unescaped.charCodeAt(0) === 0xfe &&
    unescaped.charCodeAt(1) === 0xff
  ) {
    let utf16 = '';
    for (let i = 2; i + 1 < unescaped.length; i += 2) {
      const code = (unescaped.charCodeAt(i) << 8) | unescaped.charCodeAt(i + 1);
      if (code > 0) utf16 += String.fromCharCode(code);
    }
    return utf16.trim();
  }

  return unescaped.replace(/\0/g, '').trim();
}

function decodePdfHex(hexInput: string): string {
  let clean = hexInput.replace(/\s+/g, '');
  if (clean.length < 2) return '';
  if (clean.length % 2 !== 0) clean += '0';

  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }

  // UTF-16BE com BOM (FE FF)
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let utf16 = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      const code = (bytes[i] << 8) | bytes[i + 1];
      if (code > 0) utf16 += String.fromCharCode(code);
    }
    return utf16.trim();
  }

  let out = '';
  for (const b of bytes) {
    if (b >= 32 && b <= 255) {
      out += String.fromCharCode(b);
    }
  }
  return out.trim();
}

function extractPdfInfoField(source: string, key: string): string | null {
  // 1. Literal string: /Key (valor)
  const parenRegex = new RegExp(`\\/${key}\\s*\\(([^()\\\\]*(?:\\\\.[^()\\\\]*)*)\\)`, 'i');
  const m1 = source.match(parenRegex);
  if (m1 && m1[1]) {
    const val = decodePdfLiteral(m1[1]);
    if (val) return val;
  }

  // 2. Hex string: /Key <FEFF...>
  const hexRegex = new RegExp(`\\/${key}\\s*<([0-9A-Fa-f\\s]+)>`, 'i');
  const m2 = source.match(hexRegex);
  if (m2 && m2[1]) {
    const val = decodePdfHex(m2[1]);
    if (val) return val;
  }

  return null;
}

function extractXmpTag(source: string, tagName: string): string | null {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const m = source.match(regex);
  if (m && m[1]) {
    const cleaned = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned) return cleaned;
  }
  return null;
}

function decodePdfStreamsWithCMap(streams: string[]): { readableText: string; cmapsCount: number } {
  const cmap = new Map<number, string>();

  for (const s of streams) {
    if (!s.includes('beginbfchar') && !s.includes('beginbfrange')) continue;

    const bfCharBlocks = s.match(/beginbfchar[\s\S]*?endbfchar/g) || [];
    for (const block of bfCharBlocks) {
      const pairRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let pair: RegExpExecArray | null;
      while ((pair = pairRegex.exec(block)) !== null) {
        const src = parseInt(pair[1], 16);
        const dst = decodePdfHex(pair[2]) || String.fromCharCode(parseInt(pair[2], 16));
        if (!Number.isNaN(src) && dst) {
          cmap.set(src, dst);
        }
      }
    }

    const bfRangeBlocks = s.match(/beginbfrange[\s\S]*?endbfrange/g) || [];
    for (const block of bfRangeBlocks) {
      const rangeRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let range: RegExpExecArray | null;
      while ((range = rangeRegex.exec(block)) !== null) {
        const start = parseInt(range[1], 16);
        const end = parseInt(range[2], 16);
        const dstStart = parseInt(range[3], 16);
        if (!Number.isNaN(start) && !Number.isNaN(end) && !Number.isNaN(dstStart) && end >= start && end - start <= 1024) {
          for (let code = start; code <= end; code++) {
            const unicodeVal = dstStart + (code - start);
            if (unicodeVal >= 32 && unicodeVal <= 0xffff) {
              cmap.set(code, String.fromCharCode(unicodeVal));
            }
          }
        }
      }
    }
  }

  const literalParts: string[] = [];
  const cmapParts: string[] = [];
  const directHexParts: string[] = [];

  for (const s of streams) {
    // 1. Strings literais (...)
    const parenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let match: RegExpExecArray | null;
    let streamLiteral = '';
    while ((match = parenRegex.exec(s)) !== null) {
      const decoded = decodePdfLiteral(match[1]);
      if (decoded) streamLiteral += decoded;
    }
    if (streamLiteral) literalParts.push(streamLiteral);

    // 2. Strings hexadecimais <...> (separando CMap /ToUnicode do Hex direto para não intercalar dígitos)
    const hexRegex = /<([0-9A-Fa-f\s]{2,})>/g;
    let streamCmap = '';
    let streamDirect = '';
    while ((match = hexRegex.exec(s)) !== null) {
      const hex = match[1].replace(/\s+/g, '');
      if (cmap.size > 0 && hex.length % 4 === 0) {
        let mapped = '';
        for (let i = 0; i < hex.length; i += 4) {
          const glyph = parseInt(hex.slice(i, i + 4), 16);
          const ch = cmap.get(glyph);
          if (ch) mapped += ch;
        }
        if (mapped) streamCmap += mapped;
      }
      const direct = decodePdfHex(hex);
      if (direct) streamDirect += direct;
    }
    if (streamCmap) cmapParts.push(streamCmap);
    if (streamDirect) directHexParts.push(streamDirect);
  }

  return {
    readableText: [...literalParts, ...cmapParts, ...directHexParts].join('\n'),
    cmapsCount: cmap.size,
  };
}

/**
 * Validador local completo de PDF (assinatura %PDF-, descompressão FlateDecode via pako,
 * decodificação UTF-16BE / CMap / XMP, extração de metadados e auditoria de CPF/CNPJ).
 */
function validatePdfBytesLocally(
  pdfBytes: Uint8Array,
  expectedDigits: string,
  expectedType: 'CPF' | 'CNPJ'
): { data: DocumentValidationResultDto | null; error: string | null; status: number } {
  if (!pdfBytes || pdfBytes.length === 0) {
    return { data: null, error: 'O arquivo PDF enviado está vazio.', status: 400 };
  }

  if (pdfBytes.length > MAX_PDF_SIZE_BYTES) {
    return { data: null, error: 'O arquivo PDF excede o tamanho máximo permitido de 5 MB.', status: 400 };
  }

  const rawLatin1 = uint8ArrayToLatin1(pdfBytes);
  const header = rawLatin1.slice(0, 8).trim();
  if (!rawLatin1.startsWith('%PDF-')) {
    console.warn('[PDF Debug] Assinatura inválida:', header);
    return {
      data: null,
      error: 'O arquivo enviado não é um documento PDF válido (assinatura %PDF- ausente).',
      status: 400,
    };
  }

  const allStreams: string[] = [rawLatin1];
  let decompressedStreamsCount = 0;

  // Descomprime todos os blocos stream ... endstream (FlateDecode)
  let searchPos = 0;
  while (searchPos < rawLatin1.length) {
    const streamIdx = rawLatin1.indexOf('stream', searchPos);
    if (streamIdx === -1) break;

    let dataStart = streamIdx + 6;
    if (rawLatin1[dataStart] === '\r' && rawLatin1[dataStart + 1] === '\n') {
      dataStart += 2;
    } else if (rawLatin1[dataStart] === '\n' || rawLatin1[dataStart] === '\r') {
      dataStart += 1;
    } else {
      searchPos = streamIdx + 6;
      continue;
    }

    const endStreamIdx = rawLatin1.indexOf('endstream', dataStart);
    if (endStreamIdx === -1) break;

    let dataEnd = endStreamIdx;
    while (dataEnd > dataStart && (rawLatin1[dataEnd - 1] === '\r' || rawLatin1[dataEnd - 1] === '\n')) {
      dataEnd--;
    }

    if (dataEnd > dataStart) {
      const compressedSlice = pdfBytes.subarray(dataStart, dataEnd);
      try {
        const inflated = pako.inflate(compressedSlice);
        const inflatedStr = uint8ArrayToLatin1(inflated);
        allStreams.push(inflatedStr);
        decompressedStreamsCount++;
      } catch {
        try {
          const inflatedRaw = pako.inflateRaw(compressedSlice);
          const inflatedStr = uint8ArrayToLatin1(inflatedRaw);
          allStreams.push(inflatedStr);
          decompressedStreamsCount++;
        } catch {
          // Stream não comprimido com zlib ou imagem binária
        }
      }
    }

    searchPos = endStreamIdx + 9;
  }

  const combinedRawAndStreams = allStreams.join('\n');
  const pageMatches = combinedRawAndStreams.match(/\/Type\s*\/Page\b/g);
  const pageCount = Math.max(1, pageMatches ? pageMatches.length : 1);

  const customMetadata: Record<string, string> = {
    PdfHeader: header,
    FileSizeBytes: String(pdfBytes.length),
    DecompressedStreams: String(decompressedStreamsCount),
  };

  const knownKeys = [
    'Title',
    'Author',
    'Subject',
    'Keywords',
    'Creator',
    'Producer',
    'CreationDate',
    'ModDate',
    'CPF',
    'CNPJ',
    'Documento',
    'Name',
  ];

  for (const key of knownKeys) {
    const val = extractPdfInfoField(combinedRawAndStreams, key);
    if (val) {
      customMetadata[key] = val;
    }
  }

  const xmpTitle = extractXmpTag(combinedRawAndStreams, 'dc:title');
  const xmpAuthor = extractXmpTag(combinedRawAndStreams, 'dc:creator');
  const xmpSubject = extractXmpTag(combinedRawAndStreams, 'dc:description');
  const xmpKeywords = extractXmpTag(combinedRawAndStreams, 'pdf:Keywords');
  const xmpCreator = extractXmpTag(combinedRawAndStreams, 'xmp:CreatorTool');
  const xmpProducer = extractXmpTag(combinedRawAndStreams, 'pdf:Producer');

  if (xmpTitle && !customMetadata.Title) customMetadata.Title = xmpTitle;
  if (xmpAuthor && !customMetadata.Author) customMetadata.Author = xmpAuthor;
  if (xmpSubject && !customMetadata.Subject) customMetadata.Subject = xmpSubject;
  if (xmpKeywords && !customMetadata.Keywords) customMetadata.Keywords = xmpKeywords;
  if (xmpCreator && !customMetadata.Creator) customMetadata.Creator = xmpCreator;
  if (xmpProducer && !customMetadata.Producer) customMetadata.Producer = xmpProducer;

  const { readableText, cmapsCount } = decodePdfStreamsWithCMap(allStreams);
  customMetadata.CMapGlyphs = String(cmapsCount);

  const metaLines = Object.entries(customMetadata)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const cleanPreview = readableText.replace(/\s+/g, ' ').trim();
  const extractedTextPreview = cleanPreview.length > 400 ? `${cleanPreview.slice(0, 400)}...` : cleanPreview;

  const cleanExpectedDigits = expectedDigits.replace(/\D/g, '');
  const fullText = `${metaLines}\n${readableText}\n${combinedRawAndStreams}`;
  const readableDigitsOnly = readableText.replace(/\D/g, '');
  const metaDigitsOnly = metaLines.replace(/\D/g, '');
  const digitsOnlyCorpus = fullText.replace(/\D/g, '');

  const candidateRegex =
    expectedType === 'CNPJ'
      ? /\d{2}[\s.\-]*\d{3}[\s.\-]*\d{3}[\s./\-]*\d{4}[\s.\-]*\d{2}/g
      : /\d{3}[\s.\-]*\d{3}[\s.\-]*\d{3}[\s.\-]*\d{2}/g;

  const rawCandidateMatches = `${metaLines}\n${readableText}`.match(candidateRegex) || [];
  const matchedCandidatesClean = Array.from(
    new Set(
      rawCandidateMatches
        .map((m) => m.replace(/\D/g, ''))
        .filter((d) => d.length === (expectedType === 'CNPJ' ? 14 : 11))
    )
  );

  customMetadata.ExpectedCleanDigits = cleanExpectedDigits;
  customMetadata.FoundCleanCandidates = matchedCandidatesClean.join(', ');

  const metadata: PdfMetadataDto = {
    title: customMetadata.Title || null,
    author: customMetadata.Author || null,
    subject: customMetadata.Subject || null,
    keywords: customMetadata.Keywords || null,
    creator: customMetadata.Creator || null,
    producer: customMetadata.Producer || null,
    creationDate: customMetadata.CreationDate || null,
    modifiedDate: customMetadata.ModDate || null,
    pageCount,
    customMetadata,
    extractedTextLength: cleanPreview.length,
    extractedTextPreview: extractedTextPreview || null,
  };

  const flexiblePattern = new RegExp(
    cleanExpectedDigits
      .split('')
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[\\s.\\-/\\0]*'),
    'i'
  );

  const isMatch =
    matchedCandidatesClean.includes(cleanExpectedDigits) ||
    readableDigitsOnly.includes(cleanExpectedDigits) ||
    metaDigitsOnly.includes(cleanExpectedDigits) ||
    digitsOnlyCorpus.includes(cleanExpectedDigits) ||
    flexiblePattern.test(fullText);

  console.log('[PDF Debug] 3. Extração Local e Comparação Limpa (apenas números):', {
    expectedCleanDigits: cleanExpectedDigits,
    foundCleanCandidates: matchedCandidatesClean,
    isMatch,
    metadata: {
      title: metadata.title,
      author: metadata.author,
      subject: metadata.subject,
      keywords: metadata.keywords,
      creator: metadata.creator,
      producer: metadata.producer,
      creationDate: metadata.creationDate,
      modifiedDate: metadata.modifiedDate,
      pageCount: metadata.pageCount,
    },
    extractedTextLength: cleanPreview.length,
    extractedTextPreview: extractedTextPreview.slice(0, 250),
  });

  const formattedExpected =
    expectedType === 'CNPJ' ? applyCNPJMask(cleanExpectedDigits) : applyCPFMask(cleanExpectedDigits);

  if (isMatch) {
    const dto: DocumentValidationResultDto = {
      isValid: true,
      extractedDocumentNumber: cleanExpectedDigits,
      expectedDocumentNumber: cleanExpectedDigits,
      documentType: expectedType,
      metadata,
      message: `${expectedType} ${formattedExpected} (${cleanExpectedDigits}) validado com sucesso nos metadados/conteúdo do PDF (${pageCount} página(s)).`,
    };
    return { data: dto, error: null, status: 200 };
  }

  let divergentFound: string | null = null;
  for (const candidate of matchedCandidatesClean) {
    if (
      expectedType === 'CNPJ' &&
      candidate.length === 14 &&
      isValidCNPJ(candidate) &&
      candidate !== cleanExpectedDigits
    ) {
      divergentFound = applyCNPJMask(candidate);
      break;
    }
    if (
      expectedType === 'CPF' &&
      candidate.length === 11 &&
      isValidCPF(candidate) &&
      candidate !== cleanExpectedDigits
    ) {
      divergentFound = applyCPFMask(candidate);
      break;
    }
  }

  let mismatchMessage: string;
  if (divergentFound) {
    mismatchMessage = `Divergência detectada: o PDF contém o ${expectedType} ${divergentFound}, que é diferente do informado (${formattedExpected}).`;
  } else if (
    cleanPreview.length === 0 &&
    !metadata.title &&
    !metadata.subject &&
    !metadata.keywords
  ) {
    mismatchMessage = `O PDF enviado aparenta ser uma imagem digitalizada (sem texto selecionável e sem ${expectedType} nos metadados). Envie um PDF digital contendo o ${expectedType} ${formattedExpected}.`;
  } else {
    mismatchMessage = `O ${expectedType} informado (${formattedExpected}) não foi localizado no conteúdo ou nos metadados do PDF enviado.`;
  }

  const invalidDto: DocumentValidationResultDto = {
    isValid: false,
    extractedDocumentNumber: divergentFound,
    expectedDocumentNumber: formattedExpected,
    documentType: expectedType,
    metadata,
    message: mismatchMessage,
  };

  return { data: invalidDto, error: mismatchMessage, status: 400 };
}

export const documentService = {
  async pickPdfDocument(): Promise<{ file: PickedPdfFile | null; error: string | null; canceled: boolean }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { file: null, error: null, canceled: true };
      }

      const asset = result.assets[0];
      const fileName = asset.name || 'documento.pdf';
      const mimeType = asset.mimeType || 'application/pdf';

      console.log('[PDF Debug] 1. Arquivo selecionado:', {
        name: fileName,
        uri: asset.uri,
        size: asset.size,
        mimeType,
      });

      if (
        !fileName.toLowerCase().endsWith('.pdf') &&
        !mimeType.toLowerCase().includes('pdf')
      ) {
        return {
          file: null,
          error: 'Selecione apenas arquivos no formato PDF (.pdf).',
          canceled: false,
        };
      }

      if (asset.size && asset.size > MAX_PDF_SIZE_BYTES) {
        return {
          file: null,
          error: 'O arquivo PDF excede o tamanho máximo permitido de 5 MB.',
          canceled: false,
        };
      }

      return {
        file: {
          uri: asset.uri,
          name: fileName,
          size: asset.size,
          mimeType,
          file: (asset as any).file,
        },
        error: null,
        canceled: false,
      };
    } catch (err: any) {
      console.error('[PDF Debug] Erro ao abrir DocumentPicker:', err);
      return {
        file: null,
        error: err?.message || 'Erro ao selecionar o arquivo PDF.',
        canceled: false,
      };
    }
  },

  async verifyDocumentPdf(
    pdf: PickedPdfFile,
    documentNumber: string,
    role: 'client' | 'provider' | 'cpf' | 'cnpj'
  ): Promise<{ data: DocumentValidationResultDto | null; error: string | null; status: number }> {
    const cleanDoc = documentNumber.replace(/\D/g, '');
    const resolvedType: 'CPF' | 'CNPJ' =
      role === 'provider' || role === 'cnpj' || cleanDoc.length === 14 ? 'CNPJ' : 'CPF';
    const safeFileName =
      pdf.name && pdf.name.toLowerCase().endsWith('.pdf')
        ? pdf.name
        : `${pdf.name || 'documento'}.pdf`;

    // 1. Lê o arquivo PDF em Base64 e bytes
    const fileData = await readPdfAsBase64AndBytes(pdf);

    if (fileData?.bytes) {
      const headerStr = uint8ArrayToLatin1(fileData.bytes.subarray(0, Math.min(8, fileData.bytes.length))).trim();
      console.log('[PDF Debug] 2. Bytes lidos do PDF:', {
        fileName: safeFileName,
        byteLength: fileData.bytes.length,
        base64Length: fileData.base64.length,
        pdfHeader: headerStr,
        expectedDocument: cleanDoc,
        expectedType: resolvedType,
      });
    } else {
      console.warn('[PDF Debug] 2. Não foi possível ler os bytes locais do PDF:', pdf.uri);
    }

    // Executa também a inspeção local para registrar sempre o log detalhado dos metadados no console do app
    const localInspection = fileData?.bytes
      ? validatePdfBytesLocally(fileData.bytes, cleanDoc, resolvedType)
      : null;

    if (fileData?.base64) {
      const base64Res = await apiRequest<DocumentValidationResultDto>('/api/Auth/verify-document-base64', {
        method: 'POST',
        body: JSON.stringify({
          base64Data: fileData.base64,
          fileName: safeFileName,
          documentNumber: cleanDoc,
          role,
        }),
      });

      console.log('[PDF Debug] 4. Resposta da API (/api/Auth/verify-document-base64):', {
        status: base64Res.status,
        isValid: base64Res.data?.isValid,
        extractedDocumentNumber: base64Res.data?.extractedDocumentNumber,
        message: base64Res.data?.message || base64Res.error,
        apiMetadata: base64Res.data?.metadata,
      });

      // Se a rota base64 respondeu (200 válido ou 400 divergente)
      if (base64Res.status === 200 || base64Res.status === 400) {
        // Mescla metadados locais caso o backend ainda não tenha sido reiniciado com os novos campos de diagnóstico
        if (base64Res.data && localInspection?.data?.metadata) {
          const apiMeta = base64Res.data.metadata;
          const localMeta = localInspection.data.metadata;
          base64Res.data.metadata = {
            ...localMeta,
            ...apiMeta,
            title: apiMeta?.title || localMeta.title,
            author: apiMeta?.author || localMeta.author,
            subject: apiMeta?.subject || localMeta.subject,
            keywords: apiMeta?.keywords || localMeta.keywords,
            creator: apiMeta?.creator || localMeta.creator,
            producer: apiMeta?.producer || localMeta.producer,
            creationDate: apiMeta?.creationDate || localMeta.creationDate,
            modifiedDate: apiMeta?.modifiedDate || localMeta.modifiedDate,
            customMetadata: apiMeta?.customMetadata || localMeta.customMetadata,
            extractedTextLength: apiMeta?.extractedTextLength ?? localMeta.extractedTextLength,
            extractedTextPreview: apiMeta?.extractedTextPreview || localMeta.extractedTextPreview,
            pageCount: apiMeta?.pageCount || localMeta.pageCount,
          };
        }

        // Se a API não encontrou mas o decodificador local (CMap/Streams/UTF-16BE) encontrou caso o backend esteja desatualizado
        if (!base64Res.data?.isValid && localInspection?.data?.isValid) {
          console.log('[PDF Debug] Documento validado via decodificador CMap/UTF-16BE local.');
          return localInspection;
        }

        return base64Res;
      }
    }

    // 2. Na Web, tenta multipart/form-data se a rota base64 ainda não estiver ativa no backend
    if (Platform.OS === 'web') {
      const formData = new FormData();
      if (pdf.file) {
        formData.append('file', pdf.file, safeFileName);
      } else {
        const response = await fetch(pdf.uri);
        const blob = await response.blob();
        formData.append('file', blob, safeFileName);
      }
      formData.append('documentNumber', cleanDoc);
      formData.append('role', role);

      const multipartRes = await apiRequest<DocumentValidationResultDto>('/api/Auth/verify-document', {
        method: 'POST',
        body: formData,
      });

      console.log('[PDF Debug] Resposta da API (/api/Auth/verify-document multipart):', {
        status: multipartRes.status,
        isValid: multipartRes.data?.isValid,
        message: multipartRes.data?.message || multipartRes.error,
        apiMetadata: multipartRes.data?.metadata,
      });

      if (multipartRes.status === 200 || multipartRes.status === 400) {
        return multipartRes;
      }
    }

    // 3. Fallback local de leitura de bytes/metadados/streams FlateDecode do PDF
    if (localInspection) {
      return localInspection;
    }

    return {
      data: null,
      error: 'Não foi possível ler o arquivo PDF selecionado.',
      status: 400,
    };
  },
};
