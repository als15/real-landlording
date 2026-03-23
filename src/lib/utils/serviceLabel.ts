/**
 * Shared helper for displaying service type labels.
 * Handles the "other" (custom service) case by reading from service_details.
 */
export function getServiceDisplayLabel(
  serviceType: string,
  serviceDetails?: Record<string, string> | null,
  labels?: Record<string, string>
): string {
  if (serviceType === 'other') {
    return serviceDetails?.custom_service_description || 'Other Service';
  }
  return labels?.[serviceType] || serviceType;
}
