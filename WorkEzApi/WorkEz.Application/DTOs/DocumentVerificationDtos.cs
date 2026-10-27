namespace WorkEz.Application.DTOs;

public record PdfMetadataDto(
    string? Title,
    string? Author,
    string? Creator,
    string? Producer,
    string? CreationDate,
    string? ModifiedDate,
    int PageCount,
    string? Subject = null,
    string? Keywords = null,
    Dictionary<string, string>? CustomMetadata = null,
    int ExtractedTextLength = 0,
    string? ExtractedTextPreview = null
);

public record DocumentValidationResultDto(
    bool IsValid,
    string? ExtractedDocumentNumber,
    string ExpectedDocumentNumber,
    string DocumentType,
    PdfMetadataDto? Metadata,
    string Message
);

public record VerifyDocumentBase64Request(
    string? Base64Data,
    string? FileName,
    string? DocumentNumber,
    string? Role
);
