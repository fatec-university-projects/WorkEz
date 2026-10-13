# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore
COPY WorkEz.slnx ./
COPY WorkEz.Domain/*.csproj WorkEz.Domain/
COPY WorkEz.Application/*.csproj WorkEz.Application/
COPY WorkEz.Infra.Data/*.csproj WorkEz.Infra.Data/
COPY WorkEz.Infra.Ioc/*.csproj WorkEz.Infra.Ioc/
COPY WorkEz.WebUID/*.csproj WorkEz.WebUID/

RUN dotnet restore WorkEz.slnx

# Copy full source and publish
COPY . .
RUN dotnet publish WorkEz.WebUID/WorkEz.WebUID.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "WorkEz.WebUID.dll"]
