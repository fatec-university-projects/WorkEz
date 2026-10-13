using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Interfaces;
using WorkEz.Infra.Data.Context;

namespace WorkEz.Infra.Data.Repositories;

public class AppointmentRepository(AppDbContext context) : BaseRepository<Appointment>(context), IAppointmentRepository
{
    public async Task<Appointment?> GetByServiceIdAsync(Guid serviceId) => await DbSet.FirstOrDefaultAsync(a => a.ServiceId == serviceId);
}
