FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copia arquivos de projeto para otimizar cache de restore
COPY ["WorkEz.Domain/WorkEz.Domain.csproj", "WorkEz.Domain/"]
COPY ["WorkEz.Application/WorkEz.Application.csproj", "WorkEz.Application/"]
COPY ["WorkEz.Infra.Data/WorkEz.Infra.Data.csproj", "WorkEz.Infra.Data/"]
COPY ["WorkEz.Infra.Ioc/WorkEz.Infra.Ioc.csproj", "WorkEz.Infra.Ioc/"]
COPY ["WorkEz.WebUID/WorkEz.WebUID.csproj", "WorkEz.WebUID/"]

RUN dotnet restore "WorkEz.WebUID/WorkEz.WebUID.csproj"

# Copia todos os fontes do projeto
COPY . .

# Compila e publica em Release
RUN dotnet publish "WorkEz.WebUID/WorkEz.WebUID.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
ENV DOTNET_GCConserveMemory=9
EXPOSE 10000

ENTRYPOINT ["dotnet", "WorkEz.WebUID.dll"]
