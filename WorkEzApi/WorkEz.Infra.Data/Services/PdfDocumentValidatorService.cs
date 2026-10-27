using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using UglyToad.PdfPig;
using WorkEz.Application.DTOs;
using WorkEz.Application.Interfaces;
using WorkEz.Domain.Common;

namespace WorkEz.Infra.Data.Services;

public class PdfDocumentValidatorService(
    ILogger<PdfDocumentValidatorService>? logger = null
) : IPdfDocumentValidatorService
{
    private const long MaxPdfSizeBytes = 5 * 1024 * 1024; // 5 MB
    private readonly ILogger<PdfDocumentValidatorService>? _logger = logger;

    public async Task<Result<DocumentValidationResultDto>> ValidateDocumentPdfAsync(
        Stream pdfStream,
        string expectedDocumentNumber,
        string expectedType
    )
    {
        var normalizedExpected = ExtractDigits(expectedDocumentNumber);
        var normalizedType = (expectedType ?? string.Empty).Trim().ToUpperInvariant() == "CNPJ" ? "CNPJ" : "CPF";

        if (string.IsNullOrWhiteSpace(normalizedExpected))
        {
            return Result<DocumentValidationResultDto>.Failure(
                $"Informe um {normalizedType} válido para verificação.",
                "INVALID_DOCUMENT_NUMBER"
            );
        }

        if (normalizedType == "CPF" && !IsValidCpf(normalizedExpected))
        {
            return Result<DocumentValidationResultDto>.Failure(
                "O CPF informado não possui dígitos verificadores válidos.",
                "INVALID_CPF"
            );
        }

        if (normalizedType == "CNPJ" && !IsValidCnpj(normalizedExpected))
        {
            return Result<DocumentValidationResultDto>.Failure(
                "O CNPJ informado não possui dígitos verificadores válidos.",
                "INVALID_CNPJ"
            );
        }

        if (pdfStream == null)
        {
            return Result<DocumentValidationResultDto>.Failure(
                "Nenhum arquivo PDF foi enviado.",
                "MISSING_PDF"
            );
        }

        await using var memoryStream = new MemoryStream();
        await pdfStream.CopyToAsync(memoryStream);

        if (memoryStream.Length == 0)
        {
            return Result<DocumentValidationResultDto>.Failure(
                "O arquivo PDF enviado está vazio.",
                "EMPTY_PDF"
            );
        }

        if (memoryStream.Length > MaxPdfSizeBytes)
        {
            return Result<DocumentValidationResultDto>.Failure(
                "O arquivo PDF excede o tamanho máximo permitido de 5 MB.",
                "PDF_TOO_LARGE"
            );
        }

        var rawBytes = memoryStream.ToArray();
        var headerBytes = rawBytes.AsSpan(0, Math.Min(8, rawBytes.Length));
        var headerString = Encoding.ASCII.GetString(headerBytes);

        if (!headerString.StartsWith("%PDF-", StringComparison.Ordinal))
        {
            LogDiagnostic($"Assinatura inválida: '{headerString}' ({rawBytes.Length} bytes)");
            return Result<DocumentValidationResultDto>.Failure(
                "O arquivo enviado não é um documento PDF válido (assinatura %PDF- ausente).",
                "INVALID_PDF_SIGNATURE"
            );
        }

        memoryStream.Position = 0;

        var customMetadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var readableTextBuilder = new StringBuilder();
        var corpusBuilder = new StringBuilder();

        string? title = null;
        string? author = null;
        string? subject = null;
        string? keywords = null;
        string? creator = null;
        string? producer = null;
        string? creationDate = null;
        string? modifiedDate = null;
        int pageCount = 1;
        bool pdfPigSucceeded = false;

        try
        {
            using var document = PdfDocument.Open(memoryStream);
            pdfPigSucceeded = true;
            pageCount = Math.Max(1, document.NumberOfPages);

            var info = document.Information;
            if (info != null)
            {
                title = CleanPdfString(info.Title);
                author = CleanPdfString(info.Author);
                subject = CleanPdfString(info.Subject);
                keywords = CleanPdfString(info.Keywords);
                creator = CleanPdfString(info.Creator);
                producer = CleanPdfString(info.Producer);
                creationDate = CleanPdfString(info.CreationDate);
                modifiedDate = CleanPdfString(info.ModifiedDate);

                AddIfPresent(customMetadata, "Title", title);
                AddIfPresent(customMetadata, "Author", author);
                AddIfPresent(customMetadata, "Subject", subject);
                AddIfPresent(customMetadata, "Keywords", keywords);
                AddIfPresent(customMetadata, "Creator", creator);
                AddIfPresent(customMetadata, "Producer", producer);
                AddIfPresent(customMetadata, "CreationDate", creationDate);
                AddIfPresent(customMetadata, "ModifiedDate", modifiedDate);

                if (info.DocumentInformationDictionary?.Data != null)
                {
                    foreach (var kvp in info.DocumentInformationDictionary.Data)
                    {
                        var valStr = CleanPdfString(kvp.Value?.ToString());
                        if (!string.IsNullOrWhiteSpace(valStr))
                        {
                            customMetadata[kvp.Key] = valStr;
                            corpusBuilder.AppendLine($"{kvp.Key}: {valStr}");
                            readableTextBuilder.AppendLine($"[Meta:{kvp.Key}] {valStr}");
                        }
                    }
                }

                corpusBuilder
                    .AppendLine(title)
                    .AppendLine(author)
                    .AppendLine(subject)
                    .AppendLine(keywords)
                    .AppendLine(creator)
                    .AppendLine(producer);
            }

            if (document.TryGetXmpMetadata(out var xmpMetadata) && xmpMetadata != null)
            {
                try
                {
                    var xmpBytes = xmpMetadata.GetXmlBytes();
                    if (xmpBytes is { Length: > 0 })
                    {
                        var xmpString = Encoding.UTF8.GetString(xmpBytes);
                        customMetadata["XmpLength"] = xmpString.Length.ToString();
                        corpusBuilder.AppendLine(xmpString);
                        readableTextBuilder.AppendLine(StripXmlTags(xmpString));
                    }
                }
                catch (Exception xmpEx)
                {
                    LogDiagnostic($"Aviso ao ler XMP Metadata: {xmpEx.Message}");
                }
            }

            foreach (var page in document.GetPages())
            {
                var pageText = page.Text ?? string.Empty;
                var wordsText = string.Join(" ", page.GetWords().Select(w => w.Text));
                var lettersText = string.Concat(page.Letters.Select(l => l.Value));

                if (!string.IsNullOrWhiteSpace(pageText))
                    readableTextBuilder.AppendLine(pageText);
                else if (!string.IsNullOrWhiteSpace(wordsText))
                    readableTextBuilder.AppendLine(wordsText);
                else if (!string.IsNullOrWhiteSpace(lettersText))
                    readableTextBuilder.AppendLine(lettersText);

                corpusBuilder
                    .AppendLine(pageText)
                    .AppendLine(wordsText)
                    .AppendLine(lettersText);
            }
        }
        catch (Exception ex)
        {
            LogDiagnostic($"PdfPig lançou exceção ao abrir o PDF ({ex.GetType().Name}: {ex.Message}). Executando extração direta de streams/metadados.");
        }

        // Extração complementar de streams FlateDecode, strings UTF-16BE/Hex e dicionários /Info ou /ObjStm
        var (decompressedStreamsCount, streamTexts, rawInfoFields) = ExtractFromRawAndFlateStreams(rawBytes);
        customMetadata["DecompressedStreams"] = decompressedStreamsCount.ToString();
        customMetadata["PdfPigOpened"] = pdfPigSucceeded.ToString();

        foreach (var kvp in rawInfoFields)
        {
            if (!customMetadata.ContainsKey(kvp.Key) && !string.IsNullOrWhiteSpace(kvp.Value))
                customMetadata[kvp.Key] = kvp.Value;
        }

        title ??= rawInfoFields.GetValueOrDefault("Title");
        author ??= rawInfoFields.GetValueOrDefault("Author");
        subject ??= rawInfoFields.GetValueOrDefault("Subject");
        keywords ??= rawInfoFields.GetValueOrDefault("Keywords");
        creator ??= rawInfoFields.GetValueOrDefault("Creator");
        producer ??= rawInfoFields.GetValueOrDefault("Producer");
        creationDate ??= rawInfoFields.GetValueOrDefault("CreationDate");
        modifiedDate ??= rawInfoFields.GetValueOrDefault("ModDate");

        if ( !pdfPigSucceeded && string.IsNullOrWhiteSpace(streamTexts) && rawBytes.Length < 32 )
        {
            return Result<DocumentValidationResultDto>.Failure(
                "Não foi possível ler o arquivo PDF. Verifique se o documento não está corrompido ou protegido por senha.",
                "CORRUPTED_PDF"
            );
        }

        if (!string.IsNullOrWhiteSpace(streamTexts))
        {
            corpusBuilder.AppendLine(streamTexts);
            if (readableTextBuilder.Length < 50)
            {
                readableTextBuilder.AppendLine(streamTexts);
            }
        }

        var fullText = corpusBuilder.ToString();
        var readableFull = Regex.Replace(readableTextBuilder.ToString(), @"\s+", " ").Trim();
        var previewText = readableFull.Length > 400 ? readableFull[..400] + "..." : readableFull;

        // Limpa pontuação (., -, /, espaços) tanto do documento esperado quanto de todo o conteúdo/metadados do PDF
        var cleanExpectedDigits = ExtractDigits(normalizedExpected);
        var digitsOnlyCorpus = ExtractDigits(fullText);
        var readableDigitsOnly = ExtractDigits(readableFull);

        var cpfOrCnpjPattern = normalizedType == "CNPJ"
            ? @"(?<!\d)\d{2}[\s\.\-]*\d{3}[\s\.\-]*\d{3}[\s\.\/\-]*\d{4}[\s\.\-]*\d{2}(?!\d)"
            : @"(?<!\d)\d{3}[\s\.\-]*\d{3}[\s\.\-]*\d{3}[\s\.\-]*\d{2}(?!\d)";

        var matchedCandidatesClean = new List<string>();
        foreach (Match m in Regex.Matches(fullText, cpfOrCnpjPattern))
        {
            var cleanedCandidate = ExtractDigits(m.Value);
            if (!string.IsNullOrEmpty(cleanedCandidate) && !matchedCandidatesClean.Contains(cleanedCandidate))
                matchedCandidatesClean.Add(cleanedCandidate);
        }

        var flexiblePattern = string.Join(@"[\s\.\-\/\0]*", cleanExpectedDigits.Select(c => Regex.Escape(c.ToString())));
        var isMatchInText =
            matchedCandidatesClean.Contains(cleanExpectedDigits, StringComparer.Ordinal) ||
            readableDigitsOnly.Contains(cleanExpectedDigits, StringComparison.Ordinal) ||
            digitsOnlyCorpus.Contains(cleanExpectedDigits, StringComparison.Ordinal) ||
            Regex.IsMatch(fullText, flexiblePattern, RegexOptions.IgnoreCase);

        customMetadata["ExpectedCleanDigits"] = cleanExpectedDigits;
        customMetadata["FoundCleanCandidates"] = string.Join(", ", matchedCandidatesClean);

        var metadataDto = new PdfMetadataDto(
            Title: title,
            Author: author,
            Creator: creator,
            Producer: producer,
            CreationDate: creationDate,
            ModifiedDate: modifiedDate,
            PageCount: pageCount,
            Subject: subject,
            Keywords: keywords,
            CustomMetadata: customMetadata,
            ExtractedTextLength: readableFull.Length,
            ExtractedTextPreview: previewText
        );

        var formattedExpected = normalizedType == "CNPJ"
            ? FormatCnpj(cleanExpectedDigits)
            : FormatCpf(cleanExpectedDigits);

        LogDiagnostic(
            $"Resultado da extração PDF ({rawBytes.Length} bytes, Header={headerString.Trim()}):\n" +
            $"  -> Metadados: Title='{title}', Author='{author}', Subject='{subject}', Keywords='{keywords}', Creator='{creator}', Producer='{producer}', CreationDate='{creationDate}', ModDate='{modifiedDate}', Pages={pageCount}\n" +
            $"  -> CustomMetadata: {JsonSerializer.Serialize(customMetadata)}\n" +
            $"  -> Texto Extraído ({readableFull.Length} chars): \"{previewText}\"\n" +
            $"  -> Comparação Limpa ({normalizedType}): EsperadoLimpo='{cleanExpectedDigits}' vs CandidatosLimposNoPdf=[{string.Join(", ", matchedCandidatesClean)}] | Match={isMatchInText}"
        );

        if (isMatchInText)
        {
            return Result<DocumentValidationResultDto>.Success(new DocumentValidationResultDto(
                IsValid: true,
                ExtractedDocumentNumber: cleanExpectedDigits,
                ExpectedDocumentNumber: cleanExpectedDigits,
                DocumentType: normalizedType,
                Metadata: metadataDto,
                Message: $"{normalizedType} {formattedExpected} ({cleanExpectedDigits}) validado com sucesso nos metadados/conteúdo do PDF ({metadataDto.PageCount} página(s))."
            ));
        }

        string? divergentFound = null;
        foreach (var candidate in matchedCandidatesClean)
        {
            if (normalizedType == "CNPJ" && candidate.Length == 14 && IsValidCnpj(candidate) && candidate != cleanExpectedDigits)
            {
                divergentFound = FormatCnpj(candidate);
                break;
            }
            if (normalizedType == "CPF" && candidate.Length == 11 && IsValidCpf(candidate) && candidate != cleanExpectedDigits)
            {
                divergentFound = FormatCpf(candidate);
                break;
            }
        }

        string mismatchMessage;
        if (divergentFound != null)
        {
            mismatchMessage = $"Divergência detectada: o PDF contém o {normalizedType} {divergentFound}, que é diferente do informado ({formattedExpected}).";
        }
        else if (readableFull.Length == 0 && string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(subject) && string.IsNullOrWhiteSpace(keywords))
        {
            mismatchMessage = $"O PDF enviado aparenta ser uma imagem digitalizada (sem camada de texto selecionável e sem {normalizedType} nos metadados). Envie um PDF original/digital que contenha o {normalizedType} {formattedExpected} em texto ou metadados.";
        }
        else
        {
            mismatchMessage = $"O {normalizedType} informado ({formattedExpected}) não foi localizado no conteúdo ou nos metadados do PDF enviado.";
        }

        return Result<DocumentValidationResultDto>.Success(new DocumentValidationResultDto(
            IsValid: false,
            ExtractedDocumentNumber: divergentFound,
            ExpectedDocumentNumber: formattedExpected,
            DocumentType: normalizedType,
            Metadata: metadataDto,
            Message: mismatchMessage
        ));
    }

    private void LogDiagnostic(string message)
    {
        _logger?.LogInformation("[PDF Validator] {Message}", message);
        Console.WriteLine($"[PDF Validator] {message}");
    }

    private static void AddIfPresent(Dictionary<string, string> dict, string key, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
            dict[key] = value;
    }

    private static string? CleanPdfString(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        var cleaned = raw.Replace("\0", string.Empty).Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? null : cleaned;
    }

    private static string StripXmlTags(string xml) =>
        Regex.Replace(xml, "<[^>]+>", " ");

    private static (int decompressedCount, string extractedText, Dictionary<string, string> infoFields) ExtractFromRawAndFlateStreams(byte[] pdfBytes)
    {
        var rawLatin1 = Encoding.Latin1.GetString(pdfBytes);
        var allStreams = new List<string> { rawLatin1 };
        int decompressedCount = 0;

        int searchPos = 0;
        while (searchPos < rawLatin1.Length)
        {
            int streamIdx = rawLatin1.IndexOf("stream", searchPos, StringComparison.Ordinal);
            if (streamIdx == -1) break;

            int dataStart = streamIdx + 6;
            if (dataStart + 1 < rawLatin1.Length && rawLatin1[dataStart] == '\r' && rawLatin1[dataStart + 1] == '\n')
                dataStart += 2;
            else if (dataStart < rawLatin1.Length && (rawLatin1[dataStart] == '\n' || rawLatin1[dataStart] == '\r'))
                dataStart += 1;
            else
            {
                searchPos = streamIdx + 6;
                continue;
            }

            int endStreamIdx = rawLatin1.IndexOf("endstream", dataStart, StringComparison.Ordinal);
            if (endStreamIdx == -1) break;

            int dataEnd = endStreamIdx;
            while (dataEnd > dataStart && (rawLatin1[dataEnd - 1] == '\r' || rawLatin1[dataEnd - 1] == '\n'))
                dataEnd--;

            if (dataEnd > dataStart)
            {
                var length = dataEnd - dataStart;
                var decompressed = TryDecompressFlate(pdfBytes, dataStart, length);
                if (decompressed is { Length: > 0 })
                {
                    decompressedCount++;
                    allStreams.Add(Encoding.Latin1.GetString(decompressed));
                    allStreams.Add(Encoding.UTF8.GetString(decompressed));
                }
            }

            searchPos = endStreamIdx + 9;
        }

        var combinedRaw = string.Join("\n", allStreams);
        var infoFields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        string[] knownKeys = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate", "CPF", "CNPJ", "Documento", "Name"];

        foreach (var key in knownKeys)
        {
            var val = ExtractPdfFieldValue(combinedRaw, key);
            if (!string.IsNullOrWhiteSpace(val))
                infoFields[key] = val;
        }

        // Tags XMP comuns (<dc:title>, <pdf:Producer>, <xmp:CreatorTool>, <pdf:Keywords>)
        ExtractXmpTag(combinedRaw, "dc:title", infoFields, "Title");
        ExtractXmpTag(combinedRaw, "dc:creator", infoFields, "Author");
        ExtractXmpTag(combinedRaw, "dc:description", infoFields, "Subject");
        ExtractXmpTag(combinedRaw, "pdf:Keywords", infoFields, "Keywords");
        ExtractXmpTag(combinedRaw, "xmp:CreatorTool", infoFields, "Creator");
        ExtractXmpTag(combinedRaw, "pdf:Producer", infoFields, "Producer");

        var textBuilder = new StringBuilder();
        foreach (var kvp in infoFields)
            textBuilder.AppendLine($"{kvp.Key}: {kvp.Value}");

        textBuilder.AppendLine(DecodePdfStringsAndCMap(allStreams));

        return (decompressedCount, textBuilder.ToString(), infoFields);
    }

    private static byte[]? TryDecompressFlate(byte[] buffer, int offset, int count)
    {
        try
        {
            using var input = new MemoryStream(buffer, offset, count);
            using var zlib = new ZLibStream(input, CompressionMode.Decompress);
            using var output = new MemoryStream();
            zlib.CopyTo(output);
            return output.ToArray();
        }
        catch
        {
            try
            {
                using var input = new MemoryStream(buffer, offset, count);
                using var deflate = new DeflateStream(input, CompressionMode.Decompress);
                using var output = new MemoryStream();
                deflate.CopyTo(output);
                return output.ToArray();
            }
            catch
            {
                return null;
            }
        }
    }

    private static string? ExtractPdfFieldValue(string source, string key)
    {
        // 1. Literal string: /Key (valor)
        var parenMatch = Regex.Match(source, $@"\/{Regex.Escape(key)}\s*\(([^()\\]*(?:\\.[^()\\]*)*)\)", RegexOptions.IgnoreCase);
        if (parenMatch.Success)
        {
            var decoded = DecodePdfLiteral(parenMatch.Groups[1].Value);
            if (!string.IsNullOrWhiteSpace(decoded))
                return decoded;
        }

        // 2. Hex string: /Key <FEFF...>
        var hexMatch = Regex.Match(source, $@"\/{Regex.Escape(key)}\s*<([0-9A-Fa-f\s]+)>", RegexOptions.IgnoreCase);
        if (hexMatch.Success)
        {
            var decoded = DecodePdfHex(hexMatch.Groups[1].Value);
            if (!string.IsNullOrWhiteSpace(decoded))
                return decoded;
        }

        return null;
    }

    private static void ExtractXmpTag(string source, string tagName, Dictionary<string, string> target, string targetKey)
    {
        if (target.ContainsKey(targetKey)) return;
        var match = Regex.Match(source, $@"<{Regex.Escape(tagName)}[^>]*>(.*?)<\/{Regex.Escape(tagName)}>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (match.Success)
        {
            var cleaned = Regex.Replace(match.Groups[1].Value, "<[^>]+>", " ").Trim();
            if (!string.IsNullOrWhiteSpace(cleaned))
                target[targetKey] = cleaned;
        }
    }

    private static string DecodePdfLiteral(string input)
    {
        var unescaped = Regex.Replace(input, @"\\([0-7]{1,3})", m => ((char)Convert.ToInt32(m.Groups[1].Value, 8)).ToString())
            .Replace(@"\n", "\n")
            .Replace(@"\r", "\r")
            .Replace(@"\t", "\t")
            .Replace(@"\(", "(")
            .Replace(@"\)", ")")
            .Replace(@"\\", "\\");

        if (unescaped.Length >= 2 && unescaped[0] == '\u00FE' && unescaped[1] == '\u00FF')
        {
            var bytes = Encoding.Latin1.GetBytes(unescaped[2..]);
            return Encoding.BigEndianUnicode.GetString(bytes).Replace("\0", string.Empty).Trim();
        }

        return unescaped.Replace("\0", string.Empty).Trim();
    }

    private static string DecodePdfHex(string hexInput)
    {
        var clean = Regex.Replace(hexInput, @"\s+", string.Empty);
        if (clean.Length < 2) return string.Empty;
        if (clean.Length % 2 != 0) clean += "0";

        var bytes = new byte[clean.Length / 2];
        for (int i = 0; i < bytes.Length; i++)
            bytes[i] = Convert.ToByte(clean.Substring(i * 2, 2), 16);

        if (bytes.Length >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF)
            return Encoding.BigEndianUnicode.GetString(bytes, 2, bytes.Length - 2).Replace("\0", string.Empty).Trim();

        return Encoding.UTF8.GetString(bytes).Replace("\0", string.Empty).Trim();
    }

    private static string DecodePdfStringsAndCMap(List<string> streams)
    {
        // Constrói tabela /ToUnicode (beginbfchar / beginbfrange) caso presente nos streams
        var cmap = new Dictionary<int, string>();
        foreach (var s in streams)
        {
            if (!s.Contains("beginbfchar", StringComparison.Ordinal) && !s.Contains("beginbfrange", StringComparison.Ordinal))
                continue;

            foreach (Match m in Regex.Matches(s, @"beginbfchar(.*?)endbfchar", RegexOptions.Singleline))
            {
                foreach (Match pair in Regex.Matches(m.Groups[1].Value, @"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>"))
                {
                    if (int.TryParse(pair.Groups[1].Value, System.Globalization.NumberStyles.HexNumber, null, out int src))
                    {
                        cmap[src] = DecodePdfHex(pair.Groups[2].Value);
                    }
                }
            }

            foreach (Match m in Regex.Matches(s, @"beginbfrange(.*?)endbfrange", RegexOptions.Singleline))
            {
                foreach (Match range in Regex.Matches(m.Groups[1].Value, @"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>"))
                {
                    if (int.TryParse(range.Groups[1].Value, System.Globalization.NumberStyles.HexNumber, null, out int start) &&
                        int.TryParse(range.Groups[2].Value, System.Globalization.NumberStyles.HexNumber, null, out int end) &&
                        int.TryParse(range.Groups[3].Value, System.Globalization.NumberStyles.HexNumber, null, out int dstStart) &&
                        end >= start && (end - start) <= 1024)
                    {
                        for (int code = start; code <= end; code++)
                        {
                            int unicodeVal = dstStart + (code - start);
                            if (unicodeVal is >= 32 and <= 0xFFFF)
                                cmap[code] = ((char)unicodeVal).ToString();
                        }
                    }
                }
            }
        }

        var literalSb = new StringBuilder();
        var cmapSb = new StringBuilder();
        var directHexSb = new StringBuilder();

        foreach (var s in streams)
        {
            foreach (Match m in Regex.Matches(s, @"\(([^()\\]*(?:\\.[^()\\]*)*)\)"))
            {
                var decoded = DecodePdfLiteral(m.Groups[1].Value);
                if (!string.IsNullOrWhiteSpace(decoded))
                    literalSb.Append(decoded);
            }
            literalSb.Append('\n');

            foreach (Match m in Regex.Matches(s, @"<([0-9A-Fa-f\s]{2,})>"))
            {
                var hex = Regex.Replace(m.Groups[1].Value, @"\s+", string.Empty);
                if (cmap.Count > 0 && hex.Length % 4 == 0)
                {
                    var mapped = new StringBuilder();
                    for (int i = 0; i < hex.Length; i += 4)
                    {
                        if (int.TryParse(hex.Substring(i, 4), System.Globalization.NumberStyles.HexNumber, null, out int glyph) &&
                            cmap.TryGetValue(glyph, out var ch))
                        {
                            mapped.Append(ch);
                        }
                    }
                    if (mapped.Length > 0)
                        cmapSb.Append(mapped);
                }

                var direct = DecodePdfHex(hex);
                if (!string.IsNullOrWhiteSpace(direct))
                    directHexSb.Append(direct);
            }
            cmapSb.Append('\n');
            directHexSb.Append('\n');
        }

        return $"{literalSb}\n{cmapSb}\n{directHexSb}";
    }

    public bool IsValidCpf(string cpf)
    {
        var digits = ExtractDigits(cpf);
        if (digits.Length != 11)
            return false;

        if (digits.All(c => c == digits[0]))
            return false;

        int sum1 = 0;
        for (int i = 0; i < 9; i++)
            sum1 += (digits[i] - '0') * (10 - i);

        int rem1 = (sum1 * 10) % 11;
        if (rem1 == 10) rem1 = 0;
        if (rem1 != (digits[9] - '0'))
            return false;

        int sum2 = 0;
        for (int i = 0; i < 10; i++)
            sum2 += (digits[i] - '0') * (11 - i);

        int rem2 = (sum2 * 10) % 11;
        if (rem2 == 10) rem2 = 0;
        return rem2 == (digits[10] - '0');
    }

    public bool IsValidCnpj(string cnpj)
    {
        var digits = ExtractDigits(cnpj);
        if (digits.Length != 14)
            return false;

        if (digits.All(c => c == digits[0]))
            return false;

        int[] weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        int[] weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        int sum1 = 0;
        for (int i = 0; i < 12; i++)
            sum1 += (digits[i] - '0') * weights1[i];

        int rem1 = sum1 % 11;
        int digit1 = rem1 < 2 ? 0 : 11 - rem1;
        if (digit1 != (digits[12] - '0'))
            return false;

        int sum2 = 0;
        for (int i = 0; i < 13; i++)
            sum2 += (digits[i] - '0') * weights2[i];

        int rem2 = sum2 % 11;
        int digit2 = rem2 < 2 ? 0 : 11 - rem2;
        return digit2 == (digits[13] - '0');
    }

    private static string ExtractDigits(string? input) =>
        string.IsNullOrWhiteSpace(input)
            ? string.Empty
            : new string(input.Where(c => c is >= '0' and <= '9').ToArray());

    private static string FormatCpf(string digits) =>
        digits.Length == 11
            ? $"{digits[..3]}.{digits.Substring(3, 3)}.{digits.Substring(6, 3)}-{digits.Substring(9, 2)}"
            : digits;

    private static string FormatCnpj(string digits) =>
        digits.Length == 14
            ? $"{digits[..2]}.{digits.Substring(2, 3)}.{digits.Substring(5, 3)}/{digits.Substring(8, 4)}-{digits.Substring(12, 2)}"
            : digits;
}
