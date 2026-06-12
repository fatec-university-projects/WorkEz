using FluentValidation;
using WorkEz.Api.DTOs;

namespace WorkEz.Api.Validators;

public class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
{
    public CreateUserDtoValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username é obrigatório.")
            .MinimumLength(3).WithMessage("Username deve ter no mínimo 3 caracteres.")
            .MaximumLength(50).WithMessage("Username não pode ter mais de 50 caracteres.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email é obrigatório.")
            .EmailAddress().WithMessage("O formato do email é inválido.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Senha é obrigatória.")
            .MinimumLength(8).WithMessage("Senha deve ter no mínimo 8 caracteres.")
            .MaximumLength(256).WithMessage("Senha não pode ter mais de 256 caracteres.")
            .Matches(@"[A-Z]").WithMessage("Senha deve conter pelo menos uma letra maiúscula.")
            .Matches(@"[a-z]").WithMessage("Senha deve conter pelo menos uma letra minúscula.")
            .Matches(@"[0-9]").WithMessage("Senha deve conter pelo menos um número.")
            .Matches(@"[!@#$%^&*()_+\-=\[\]{};':\""\\|,.<>\/?]").WithMessage("Senha deve conter pelo menos um caractere especial.");

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role é obrigatória.")
            .Must(r => new[] { "Customer", "ServiceProvider", "Admin" }.Contains(r))
            .WithMessage("Role deve ser 'Customer', 'ServiceProvider' ou 'Admin'.");
    }
}

public class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email é obrigatório.")
            .EmailAddress().WithMessage("O formato do email é inválido.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Senha é obrigatória.");
    }
}

public class RefreshTokenRequestDtoValidator : AbstractValidator<RefreshTokenRequestDto>
{
    public RefreshTokenRequestDtoValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token é obrigatório.");
    }
}

public class ResetPasswordDtoValidator : AbstractValidator<ResetPasswordDto>
{
    public ResetPasswordDtoValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Token é obrigatório.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Nova senha é obrigatória.")
            .MinimumLength(8).WithMessage("Senha deve ter no mínimo 8 caracteres.")
            .MaximumLength(256).WithMessage("Senha não pode ter mais de 256 caracteres.")
            .Matches(@"[A-Z]").WithMessage("Senha deve conter pelo menos uma letra maiúscula.")
            .Matches(@"[a-z]").WithMessage("Senha deve conter pelo menos uma letra minúscula.")
            .Matches(@"[0-9]").WithMessage("Senha deve conter pelo menos um número.")
            .Matches(@"[!@#$%^&*()_+\-=\[\]{};':\""\\|,.<>\/?]").WithMessage("Senha deve conter pelo menos um caractere especial.");
    }
}
