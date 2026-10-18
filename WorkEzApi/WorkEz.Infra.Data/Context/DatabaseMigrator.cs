using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace WorkEz.Infra.Data.Context;

public static class DatabaseMigrator
{
    public static void ApplySqlMigrations(AppDbContext db, string? baseDirectory = null, ILogger? logger = null)
    {
        // Só aplica em banco relacional (PostgreSQL), nunca em InMemory (usado nos testes de unidade)
        if (db.Database.ProviderName == null || !db.Database.ProviderName.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var candidates = new List<string>();
        if (!string.IsNullOrEmpty(baseDirectory))
        {
            candidates.Add(Path.Combine(baseDirectory, "scripts"));
            candidates.Add(Path.Combine(baseDirectory, "..", "scripts"));
            candidates.Add(Path.Combine(baseDirectory, "..", "..", "scripts"));
        }
        candidates.Add(Path.Combine(AppContext.BaseDirectory, "scripts"));
        candidates.Add(Path.Combine(AppContext.BaseDirectory, "..", "scripts"));
        candidates.Add(Path.Combine(AppContext.BaseDirectory, "..", "..", "scripts"));
        candidates.Add(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "scripts"));
        candidates.Add(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "scripts"));

        string? scriptsDir = candidates.FirstOrDefault(Directory.Exists);
        if (scriptsDir == null)
        {
            logger?.LogWarning("Nenhum diretório de scripts SQL de migration foi encontrado.");
            return;
        }

        var sqlFiles = Directory.GetFiles(scriptsDir, "*.sql").OrderBy(f => f).ToList();
        logger?.LogInformation("Verificando/aplicando {Count} migrações SQL a partir de: {Dir}", sqlFiles.Count, scriptsDir);

        var connection = db.Database.GetDbConnection();
        var wasClosed = connection.State == ConnectionState.Closed;
        if (wasClosed)
        {
            connection.Open();
        }

        try
        {
            foreach (var file in sqlFiles)
            {
                var fileName = Path.GetFileName(file);
                try
                {
                    var sql = File.ReadAllText(file);
                    if (string.IsNullOrWhiteSpace(sql)) continue;

                    using var command = connection.CreateCommand();
                    command.CommandText = sql;
                    command.ExecuteNonQuery();
                    logger?.LogInformation("✔ Migração SQL aplicada/verificada com sucesso: {File}", fileName);
                }
                catch (Exception ex)
                {
                    logger?.LogError(ex, "❌ Falha ao aplicar migração SQL {File}", fileName);
                    throw;
                }
            }
        }
        finally
        {
            if (wasClosed)
            {
                connection.Close();
            }
        }
    }
}
