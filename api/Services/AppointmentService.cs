using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Services;

public class AppointmentService(AppDbContext context) : IAppointmentService
{
    public async Task<IEnumerable<Appointment>> GetAllAsync()
        => await context.Appointments.AsNoTracking().ToListAsync();

    public async Task<Appointment?> GetByIdAsync(Guid id)
        => await context.Appointments.FindAsync(id);

    public async Task CreateAsync(Appointment appointment)
    {
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Appointment appointment)
    {
        context.Appointments.Update(appointment);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await context.Appointments.FindAsync(id);
        if (entity is null) return;
        context.Appointments.Remove(entity);
        await context.SaveChangesAsync();
    }
}
