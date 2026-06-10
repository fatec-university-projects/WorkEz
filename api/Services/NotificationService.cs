using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class NotificationService(AppDbContext context) : INotificationService
{
    public async Task<IEnumerable<Notification>> GetAllAsync()
        => await context.Notifications.AsNoTracking().ToListAsync();

    public async Task<Notification?> GetByIdAsync(Guid id)
        => await context.Notifications.FindAsync(id);

    public async Task CreateAsync(Notification notification)
    {
        context.Notifications.Add(notification);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Notification notification)
    {
        context.Notifications.Update(notification);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Notifications.FindAsync(id);
        if (entity is null) return;
        context.Notifications.Remove(entity);
        await context.SaveChangesAsync();
    }
}
