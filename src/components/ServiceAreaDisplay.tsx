'use client';

import { useEffect, useState } from 'react';
import { Tag, Tooltip } from 'antd';
import { EnvironmentOutlined, LoadingOutlined } from '@ant-design/icons';

interface ServiceAreaDisplayProps {
  serviceAreas: string[];  // Can be zip codes, state:XX, or prefix:XXX
  showIcon?: boolean;
}

// Helper to determine if a value is a state code
const isStateCode = (value: string): boolean => /^state:[A-Z]{2}$/.test(value);

// Helper to determine if a value is a prefix
const isPrefixCode = (value: string): boolean => /^prefix:\d{3,4}$/.test(value);

// Helper to determine if a value is a regular zip code
const isZipCode = (value: string): boolean => /^\d{5}$/.test(value);

// US State names for display
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington D.C.', PR: 'Puerto Rico',
};

// Cache for zip code lookups to avoid repeated API calls
const zipCodeCache: Record<string, string> = {};

// Try to get from localStorage first (saved by ServiceAreaAutocomplete)
const getStoredDisplayMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('serviceAreaDisplayMap') || '{}');
  } catch {
    return {};
  }
};

// Reverse geocode a zip code to get location name
const lookupZipCode = async (zip: string): Promise<string> => {
  // Check cache first
  if (zipCodeCache[zip]) {
    return zipCodeCache[zip];
  }

  // Check localStorage
  const stored = getStoredDisplayMap();
  if (stored[zip]) {
    zipCodeCache[zip] = stored[zip];
    return stored[zip];
  }

  // If Google Maps is available, do a geocode lookup
  if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise<string>((resolve) => {
        geocoder.geocode(
          { address: zip },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (results: any[] | null, status: string) => {
            if (status === 'OK' && results && results.length > 0) {
              const result = results[0];
              const localityComp = result.address_components?.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.types.includes('locality') || c.types.includes('sublocality') || c.types.includes('neighborhood')
              );
              const stateComp = result.address_components?.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.types.includes('administrative_area_level_1')
              );

              if (localityComp) {
                let displayName = localityComp.long_name;
                if (stateComp) {
                  displayName += `, ${stateComp.short_name}`;
                }
                resolve(displayName);
                return;
              }
            }
            resolve(zip); // Fallback to zip code
          }
        );
      });
      zipCodeCache[zip] = result;
      return result;
    } catch {
      return zip;
    }
  }

  return zip;
};

// Get tag color based on service area type
const getTagColor = (value: string): string => {
  if (isStateCode(value)) return 'purple';
  if (isPrefixCode(value)) {
    const prefix = value.replace('prefix:', '');
    // Philly area prefixes
    if (prefix.startsWith('191') || prefix.startsWith('190')) return 'blue';
    return 'green';
  }
  // Regular zip - blue for Philly area, orange for others
  if (value.startsWith('191') || value.startsWith('190')) return 'blue';
  return 'default';
};

// Get fallback display name for state/prefix codes
const getFallbackDisplayName = (value: string): string => {
  if (isStateCode(value)) {
    const stateCode = value.replace('state:', '');
    return `${STATE_NAMES[stateCode] || stateCode} (entire state)`;
  }
  if (isPrefixCode(value)) {
    const prefix = value.replace('prefix:', '');
    return `${prefix}${'x'.repeat(5 - prefix.length)} area`;
  }
  return value;
};

export default function ServiceAreaDisplay({ serviceAreas, showIcon = true }: ServiceAreaDisplayProps) {
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDisplayNames = async () => {
      setLoading(true);
      const names: Record<string, string> = {};

      // First, populate from localStorage
      const stored = getStoredDisplayMap();

      for (const area of serviceAreas) {
        // Check localStorage first
        if (stored[area]) {
          names[area] = stored[area];
        }
        // State codes have built-in display names
        else if (isStateCode(area)) {
          names[area] = getFallbackDisplayName(area);
        }
        // Prefix codes have built-in display names
        else if (isPrefixCode(area)) {
          names[area] = getFallbackDisplayName(area);
        }
      }

      // For zip codes without cached names, try to look them up
      const missingZips = serviceAreas.filter(area => !names[area] && isZipCode(area));

      if (missingZips.length > 0 && typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
        // Lookup in parallel but limit to avoid rate limiting
        const lookupPromises = missingZips.slice(0, 5).map(async (zip) => {
          const name = await lookupZipCode(zip);
          return { zip, name };
        });

        const results = await Promise.all(lookupPromises);
        for (const { zip, name } of results) {
          names[zip] = name;
        }

        // For remaining zips, just use the zip code
        for (const zip of missingZips.slice(5)) {
          names[zip] = zip;
        }
      } else {
        // No Google Maps available, just use zip codes as-is
        for (const zip of missingZips) {
          names[zip] = zip;
        }
      }

      setDisplayNames(names);
      setLoading(false);
    };

    if (serviceAreas.length > 0) {
      loadDisplayNames();
    } else {
      setLoading(false);
    }
  }, [serviceAreas]);

  if (serviceAreas.length === 0) {
    return <span style={{ color: '#999' }}>No service areas specified</span>;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {serviceAreas.map((area) => {
        const displayName = displayNames[area];
        const isLoadingArea = loading && !displayName && isZipCode(area);
        const showFullName = displayName && displayName !== area;
        const tooltipText = isZipCode(area) && showFullName ? `ZIP: ${area}` :
                          isPrefixCode(area) ? `Covers all ${area.replace('prefix:', '')}xx zip codes` :
                          isStateCode(area) ? `Covers entire ${area.replace('state:', '')}` :
                          undefined;

        return (
          <Tooltip key={area} title={tooltipText}>
            <Tag
              color={getTagColor(area)}
              style={{
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {showIcon && (
                isLoadingArea ? <LoadingOutlined /> : <EnvironmentOutlined />
              )}
              {isLoadingArea ? area : (showFullName ? displayName : getFallbackDisplayName(area))}
            </Tag>
          </Tooltip>
        );
      })}
    </div>
  );
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}
