import type { Service } from '@/generated/models/service-model';

function normalizeServiceName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function uniqueServices(services: Service[] = []) {
  const servicesByName = new Map<string, Service>();

  services.forEach((service) => {
    const key = normalizeServiceName(service.name1);
    if (!key) return;

    const existing = servicesByName.get(key);
    if (!existing) {
      servicesByName.set(key, service);
      return;
    }

    servicesByName.set(key, {
      ...existing,
      description: existing.description || service.description,
      iconName: existing.iconName || service.iconName,
      available247: existing.available247 || service.available247,
      displayOrder: Math.min(existing.displayOrder, service.displayOrder),
    });
  });

  return [...servicesByName.values()].sort(
    (first, second) =>
      first.displayOrder - second.displayOrder ||
      first.name1.localeCompare(second.name1)
  );
}
