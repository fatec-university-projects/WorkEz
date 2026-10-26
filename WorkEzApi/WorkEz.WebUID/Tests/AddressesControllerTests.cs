using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;
using WorkEz.Domain.Entities;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.Repositories;
using WorkEz.WebUID.Controllers;

namespace WorkEz.WebUID.Tests;

public class AddressesControllerTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static void Authenticate(ControllerBase controller, Guid? userId, string role = "Customer")
    {
        var httpContext = new DefaultHttpContext();
        if (userId.HasValue)
        {
            var identity = new ClaimsIdentity(
                [new Claim("sub", userId.Value.ToString()), new Claim(ClaimTypes.Role, role), new Claim("role", role)],
                "TestAuth");
            httpContext.User = new ClaimsPrincipal(identity);
        }
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    [Fact]
    public async Task GetMyAddresses_ShouldReturnOnlyCallerAddresses()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new BaseRepository<Address>(db);
        var controller = new AddressesController(repo);

        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();

        db.Addresses.AddRange(
            new Address
            {
                Id = Guid.NewGuid(),
                UserId = user1Id,
                Street = "Rua das Flores",
                Number = "123",
                Neighborhood = "Jardins",
                City = "São Paulo",
                State = "SP",
                ZipCode = "01400-000",
                AddressType = "Home"
            },
            new Address
            {
                Id = Guid.NewGuid(),
                UserId = user1Id,
                Street = "Av. Paulista",
                Number = "1000",
                Neighborhood = "Bela Vista",
                City = "São Paulo",
                State = "SP",
                ZipCode = "01310-100",
                AddressType = "Work"
            },
            new Address
            {
                Id = Guid.NewGuid(),
                UserId = user2Id,
                Street = "Rua Outra",
                Number = "456",
                Neighborhood = "Centro",
                City = "Rio de Janeiro",
                State = "RJ",
                ZipCode = "20000-000",
                AddressType = "Home"
            }
        );
        await db.SaveChangesAsync();

        Authenticate(controller, user1Id);

        var response = await controller.GetMyAddresses();
        var okResult = Assert.IsType<OkObjectResult>(response);
        var addresses = Assert.IsAssignableFrom<IEnumerable<AddressDto>>(okResult.Value);

        var list = addresses.ToList();
        Assert.Equal(2, list.Count);
        Assert.All(list, a => Assert.Equal(user1Id, a.UserId));
        Assert.Contains(list, a => a.Street == "Rua das Flores");
        Assert.Contains(list, a => a.Street == "Av. Paulista");
    }

    [Fact]
    public async Task GetById_ShouldReturnAddress_WhenOwnerRequests_AndForbid_WhenOtherUserRequests()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new BaseRepository<Address>(db);
        var controller = new AddressesController(repo);

        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var addr = new Address
        {
            Id = Guid.NewGuid(),
            UserId = ownerId,
            Street = "Rua Teste",
            Number = "99",
            Neighborhood = "Bairro Teste",
            City = "Curitiba",
            State = "PR",
            ZipCode = "80000-000",
            AddressType = "Home"
        };
        db.Addresses.Add(addr);
        await db.SaveChangesAsync();

        // 1. Owner requests
        Authenticate(controller, ownerId);
        var ownerRes = await controller.GetById(addr.Id);
        var okRes = Assert.IsType<OkObjectResult>(ownerRes);
        var dto = Assert.IsType<AddressDto>(okRes.Value);
        Assert.Equal(addr.Id, dto.Id);
        Assert.Equal("Rua Teste", dto.Street);

        // 2. Other user requests
        Authenticate(controller, otherUserId);
        var otherRes = await controller.GetById(addr.Id);
        var forbidRes = Assert.IsType<ObjectResult>(otherRes);
        Assert.Equal(StatusCodes.Status403Forbidden, forbidRes.StatusCode);
    }

    [Fact]
    public async Task Create_ShouldPersistAddress_WithCoordinates_AndReturnCreated()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new BaseRepository<Address>(db);
        var controller = new AddressesController(repo);

        var userId = Guid.NewGuid();
        Authenticate(controller, userId);

        var request = new CreateAddressRequest(
            Street: "Rua Nova",
            Number: "50",
            Complement: "Bloco B Apt 201",
            Neighborhood: "Vila Mariana",
            City: "São Paulo",
            State: "SP",
            ZipCode: "04101-000",
            AddressType: "Home",
            Latitude: -23.58,
            Longitude: -46.63
        );

        var response = await controller.Create(request);
        var createdResult = Assert.IsType<CreatedAtActionResult>(response);
        var dto = Assert.IsType<AddressDto>(createdResult.Value);

        Assert.Equal("Rua Nova", dto.Street);
        Assert.Equal("50", dto.Number);
        Assert.Equal("Bloco B Apt 201", dto.Complement);
        Assert.Equal(-23.58, dto.Latitude);
        Assert.Equal(-46.63, dto.Longitude);
        Assert.Equal(userId, dto.UserId);

        var persisted = await db.Addresses.FirstOrDefaultAsync(a => a.Id == dto.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Rua Nova", persisted.Street);
    }

    [Fact]
    public async Task Create_ShouldReturnBadRequest_WhenRequiredFieldsAreMissing()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new BaseRepository<Address>(db);
        var controller = new AddressesController(repo);

        var userId = Guid.NewGuid();
        Authenticate(controller, userId);

        var invalidRequest = new CreateAddressRequest(
            Street: "",
            Number: "1",
            Complement: null,
            Neighborhood: "",
            City: "São Paulo",
            State: "SP",
            ZipCode: ""
        );

        var response = await controller.Create(invalidRequest);
        Assert.IsType<BadRequestObjectResult>(response);
    }

    [Fact]
    public async Task Update_ShouldModifyFields_WhenOwnerRequests_AndForbid_WhenOtherUserRequests()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new BaseRepository<Address>(db);
        var controller = new AddressesController(repo);

        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var addr = new Address
        {
            Id = Guid.NewGuid(),
            UserId = ownerId,
            Street = "Rua Velha",
            Number = "10",
            Neighborhood = "Bairro A",
            City = "Campinas",
            State = "SP",
            ZipCode = "13000-000",
            AddressType = "Other"
        };
        db.Addresses.Add(addr);
        await db.SaveChangesAsync();

        var updateRequest = new UpdateAddressRequest(
            Street: "Rua Atualizada",
            Number: "20",
            Complement: "Casa Fundos",
            Neighborhood: "Bairro B",
            City: "Campinas",
            State: "SP",
            ZipCode: "13000-001",
            AddressType: "Home",
            Latitude: -22.90,
            Longitude: -47.06
        );

        // 1. Other user attempts update
        Authenticate(controller, otherUserId);
        var forbiddenRes = await controller.Update(addr.Id, updateRequest);
        var forbidObject = Assert.IsType<ObjectResult>(forbiddenRes);
        Assert.Equal(StatusCodes.Status403Forbidden, forbidObject.StatusCode);

        // 2. Owner updates
        Authenticate(controller, ownerId);
        var okRes = await controller.Update(addr.Id, updateRequest);
        var updatedDto = Assert.IsType<AddressDto>(Assert.IsType<OkObjectResult>(okRes).Value);

        Assert.Equal("Rua Atualizada", updatedDto.Street);
        Assert.Equal("20", updatedDto.Number);
        Assert.Equal("Casa Fundos", updatedDto.Complement);
        Assert.Equal("Bairro B", updatedDto.Neighborhood);
        Assert.Equal("Home", updatedDto.AddressType);
        Assert.Equal(-22.90, updatedDto.Latitude);

        var inDb = await db.Addresses.FindAsync(addr.Id);
        Assert.NotNull(inDb);
        Assert.Equal("Rua Atualizada", inDb.Street);
    }

    [Fact]
    public async Task Delete_ShouldRemoveAddress_WhenOwnerRequests_AndForbid_WhenOtherUserRequests()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new BaseRepository<Address>(db);
        var controller = new AddressesController(repo);

        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var addr = new Address
        {
            Id = Guid.NewGuid(),
            UserId = ownerId,
            Street = "Rua Para Deletar",
            Number = "1",
            Neighborhood = "Centro",
            City = "Santos",
            State = "SP",
            ZipCode = "11000-000",
            AddressType = "Home"
        };
        db.Addresses.Add(addr);
        await db.SaveChangesAsync();

        // 1. Other user attempts delete
        Authenticate(controller, otherUserId);
        var forbiddenRes = await controller.Delete(addr.Id);
        var forbidObject = Assert.IsType<ObjectResult>(forbiddenRes);
        Assert.Equal(StatusCodes.Status403Forbidden, forbidObject.StatusCode);
        Assert.Equal(1, await db.Addresses.CountAsync());

        // 2. Owner deletes
        Authenticate(controller, ownerId);
        var noContentRes = await controller.Delete(addr.Id);
        Assert.IsType<NoContentResult>(noContentRes);

        var inDb = await db.Addresses.FindAsync(addr.Id);
        Assert.Null(inDb);
    }

    [Fact]
    public async Task Delete_WhenAddressHasLinkedServices_ShouldNullifyAddressIdOnServices_AndRemoveAddress()
    {
        using var db = CreateInMemoryDbContext();
        var addressRepo = new BaseRepository<Address>(db);
        var serviceRepo = new ServiceRepository(db);
        var controller = new AddressesController(addressRepo, serviceRepo);

        var ownerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        var addr = new Address
        {
            Id = Guid.NewGuid(),
            UserId = ownerId,
            Street = "Rua Vinculada ao Chamado",
            Number = "500",
            Neighborhood = "Pinheiros",
            City = "São Paulo",
            State = "SP",
            ZipCode = "05422-000",
            AddressType = "Home"
        };
        db.Addresses.Add(addr);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            CategoryId = Guid.NewGuid(),
            AddressId = addr.Id,
            Title = "Serviço de Teste com Endereço",
            ServiceStatus = WorkEz.Domain.Enums.ServiceStatus.Completed
        };
        db.Services.Add(service);
        await db.SaveChangesAsync();

        Authenticate(controller, ownerId);

        var res = await controller.Delete(addr.Id);
        Assert.IsType<NoContentResult>(res);

        // O endereço deve ter sido excluído
        var inDbAddress = await db.Addresses.FindAsync(addr.Id);
        Assert.Null(inDbAddress);

        // O serviço existente continua existindo intacto no histórico, com AddressId desacoplado (null)
        var inDbService = await db.Services.FindAsync(service.Id);
        Assert.NotNull(inDbService);
        Assert.Null(inDbService.AddressId);
    }

    [Fact]
    public async Task Endpoints_ShouldReturnUnauthorized_WhenCallerHasNoIdentity()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new BaseRepository<Address>(db);
        var controller = new AddressesController(repo);

        Authenticate(controller, null);

        var getRes = await controller.GetMyAddresses();
        Assert.IsType<UnauthorizedObjectResult>(getRes);

        var getByIdRes = await controller.GetById(Guid.NewGuid());
        Assert.IsType<UnauthorizedObjectResult>(getByIdRes);

        var createRes = await controller.Create(new CreateAddressRequest("Rua", "1", null, "B", "C", "SP", "00000-000"));
        Assert.IsType<UnauthorizedObjectResult>(createRes);

        var updateRes = await controller.Update(Guid.NewGuid(), new UpdateAddressRequest("Rua", "1", null, "B", "C", "SP", "00000-000"));
        Assert.IsType<UnauthorizedObjectResult>(updateRes);

        var deleteRes = await controller.Delete(Guid.NewGuid());
        Assert.IsType<UnauthorizedObjectResult>(deleteRes);
    }
}
