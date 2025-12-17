'use client';

import { useEffect, useState } from 'react';
import { Tag, Tooltip } from 'antd';
import { EnvironmentOutlined, LoadingOutlined } from '@ant-design/icons';

interface ServiceAreaDisplayProps {
  zipCodes: string[];
  showIcon?: boolean;
}

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

export default function ServiceAreaDisplay({ zipCodes, showIcon = true }: ServiceAreaDisplayProps) {
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDisplayNames = async () => {
      setLoading(true);
      const names: Record<string, string> = {};

      // First, populate from localStorage
      const stored = getStoredDisplayMap();
      for (const zip of zipCodes) {
        if (stored[zip]) {
          names[zip] = stored[zip];
        }
      }

      // For any missing, try to look them up (but don't block)
      const missingZips = zipCodes.filter(zip => !names[zip]);

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
        // No Google Maps available, just use zip codes
        for (const zip of missingZips) {
          names[zip] = zip;
        }
      }

      setDisplayNames(names);
      setLoading(false);
    };

    if (zipCodes.length > 0) {
      loadDisplayNames();
    } else {
      setLoading(false);
    }
  }, [zipCodes]);

  if (zipCodes.length === 0) {
    return <span style={{ color: '#999' }}>No service areas specified</span>;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {zipCodes.map((zip) => {
        const displayName = displayNames[zip];
        const isLoading = loading && !displayName;
        const showFullName = displayName && displayName !== zip;

        return (
          <Tooltip key={zip} title={showFullName ? `ZIP: ${zip}` : undefined}>
            <Tag
              style={{
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {showIcon && (
                isLoading ? <LoadingOutlined /> : <EnvironmentOutlined />
              )}
              {isLoading ? zip : (showFullName ? displayName : zip)}
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
