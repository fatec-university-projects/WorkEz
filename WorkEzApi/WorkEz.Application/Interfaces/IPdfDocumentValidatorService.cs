using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;

namespace WorkEz.Application.Interfaces;

public interface IPdfDocumentValidatorService
{
    Task<Result<DocumentValidationResultDto>> ValidateDocumentPdfAsync(
        Stream pdfStream,
        string expectedDocumentNumber,
        string expectedType
    );

    bool IsValidCpf(string cpf);
    bool IsValidCnpj(string cnpj);
}
