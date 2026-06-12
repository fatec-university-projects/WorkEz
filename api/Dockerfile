FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["WorkEz.Api.csproj", "./"]
RUN dotnet restore "WorkEz.Api.csproj"

COPY . .
RUN dotnet publish "WorkEz.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
ENV DOTNET_GCConserveMemory=9
EXPOSE 10000

ENTRYPOINT ["dotnet", "WorkEz.Api.dll"]