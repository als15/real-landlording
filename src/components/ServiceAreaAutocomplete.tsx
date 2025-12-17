'use client';

import { useEffect, useRef, useState } from 'react';
import { Tag, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

interface ServiceAreaAutocompleteProps {
  value?: string[];  // Array of zip codes (for backward compatibility with DB)
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
}

// Philadelphia area zip codes for visual indicator
const PHILLY_AREA_ZIPS = new Set([
  // Philadelphia
  '19102', '19103', '19104', '19106', '19107', '19108', '19109', '19110',
  '19111', '19112', '19113', '19114', '19115', '19116', '19118', '19119',
  '19120', '19121', '19122', '19123', '19124', '19125', '19126', '19127',
  '19128', '19129', '19130', '19131', '19132', '19133', '19134', '19135',
  '19136', '19137', '19138', '19139', '19140', '19141', '19142', '19143',
  '19144', '19145', '19146', '19147', '19148', '19149', '19150', '19151',
  '19152', '19153', '19154', '19155',
  // Surrounding PA areas
  '19001', '19002', '19003', '19004', '19006', '19007', '19008', '19009',
  '19010', '19012', '19013', '19014', '19015', '19018', '19019', '19020',
  '19021', '19022', '19023', '19025', '19026', '19027', '19028', '19029',
  '19030', '19031', '19032', '19033', '19034', '19035', '19036', '19038',
  '19040', '19041', '19043', '19044', '19046', '19047', '19048', '19050',
  '19053', '19054', '19055', '19056', '19057', '19060', '19061', '19063',
  '19064', '19066', '19067', '19070', '19072', '19073', '19074', '19075',
  '19076', '19078', '19079', '19080', '19081', '19082', '19083', '19085',
  '19086', '19087', '19088', '19089', '19090', '19092', '19093', '19094',
  '19095', '19096',
  // NJ areas
  '07030', '07302', '07304', '07305', '07306', '07307', '07310', '07311', // Hudson County
  '08002', '08003', '08004', '08007', '08009', '08010', '08012', '08014',
  '08016', '08018', '08019', '08020', '08021', '08026', '08027', '08028',
  '08029', '08030', '08031', '08032', '08033', '08034', '08035', '08036',
  '08037', '08039', '08041', '08043', '08045', '08046', '08048', '08049',
  '08050', '08051', '08052', '08053', '08054', '08055', '08056', '08057',
  '08059', '08060', '08061', '08062', '08063', '08065', '08066', '08067',
  '08068', '08069', '08070', '08071', '08072', '08073', '08074', '08075',
  '08076', '08077', '08078', '08079', '08080', '08081', '08083', '08084',
  '08085', '08086', '08088', '08089', '08090', '08091', '08093', '08094',
  '08095', '08096', '08097', '08099', '08101', '08102', '08103', '08104',
  '08105', '08106', '08107', '08108', '08109', '08110',
]);

// Track script loading globally
let isScriptLoading = false;
let isScriptLoaded = false;
const callbacks: (() => void)[] = [];

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    if (isScriptLoading) {
      callbacks.push(() => resolve());
      return;
    }

    if (window.google?.maps?.places) {
      isScriptLoaded = true;
      resolve();
      return;
    }

    isScriptLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;

    script.onload = () => {
      const checkPlaces = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkPlaces);
          isScriptLoaded = true;
          isScriptLoading = false;
          resolve();
          callbacks.forEach(cb => cb());
          callbacks.length = 0;
        }
      }, 50);

      setTimeout(() => {
        clearInterval(checkPlaces);
        if (!isScriptLoaded) {
          reject(new Error('Timeout loading Places library'));
        }
      }, 5000);
    };

    script.onerror = () => {
      isScriptLoading = false;
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
};

// Store display names in localStorage to persist across sessions
const DISPLAY_MAP_KEY = 'serviceAreaDisplayMap';
const getStoredDisplayMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DISPLAY_MAP_KEY) || '{}');
  } catch {
    return {};
  }
};
const storeDisplayMap = (map: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISPLAY_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
};

export default function ServiceAreaAutocomplete({
  value = [],
  onChange,
  placeholder = 'Search for cities, neighborhoods, or enter zip codes...',
  size = 'large',
  disabled = false,
}: ServiceAreaAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [displayMap, setDisplayMap] = useState<Record<string, string>>(getStoredDisplayMap);

  // Use refs to access current values in event listeners
  // We track our own internal state to avoid race conditions with React's state updates
  const internalValueRef = useRef<string[]>(value);
  const onChangeRef = useRef(onChange);
  const displayMapRef = useRef(displayMap);

  // Only sync onChange ref (this is stable and won't cause race conditions)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync internal value with prop ONLY when prop changes from external source
  // We detect this by comparing lengths - if prop is shorter, it was an external reset
  useEffect(() => {
    // If the prop value is different and shorter (e.g., form reset), sync it
    if (value.length < internalValueRef.current.length ||
        (value.length === 0 && internalValueRef.current.length > 0)) {
      internalValueRef.current = value;
    }
    // If prop has items we don't have (external addition), sync those too
    const hasNewItems = value.some(v => !internalValueRef.current.includes(v));
    if (hasNewItems) {
      internalValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    displayMapRef.current = displayMap;
  }, [displayMap]);

  // Update display map in localStorage when it changes
  useEffect(() => {
    storeDisplayMap(displayMap);
  }, [displayMap]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoading && !error && inputRef.current && !autocompleteRef.current && window.google?.maps?.places) {
      initAutocomplete();
    }
  }, [isLoading, error]);

  // Helper to get zip code via reverse geocoding
  const getZipFromLatLng = (lat: number, lng: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat, lng } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results: any[] | null, status: string) => {
          if (status === 'OK' && results && results.length > 0) {
            for (const result of results) {
              const zipComp = result.address_components?.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.types.includes('postal_code')
              );
              if (zipComp) {
                resolve(zipComp.short_name);
                return;
              }
            }
          }
          resolve(null);
        }
      );
    });
  };

  // Helper to geocode an address/place name to get zip
  const geocodeAddress = (address: string): Promise<{ zip: string; displayName: string } | null> => {
    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results: any[] | null, status: string) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0];
            const zipComp = result.address_components?.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) => c.types.includes('postal_code')
            );
            const localityComp = result.address_components?.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) => c.types.includes('locality') || c.types.includes('sublocality') || c.types.includes('neighborhood')
            );
            const stateComp = result.address_components?.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) => c.types.includes('administrative_area_level_1')
            );

            if (zipComp) {
              let displayName = localityComp?.long_name || address.split(',')[0];
              if (stateComp) {
                displayName += `, ${stateComp.short_name}`;
              }
              displayName += ` (${zipComp.short_name})`;
              resolve({ zip: zipComp.short_name, displayName });
              return;
            }

            // No zip in first result, try to reverse geocode the location
            if (result.geometry?.location) {
              const lat = result.geometry.location.lat();
              const lng = result.geometry.location.lng();
              getZipFromLatLng(lat, lng).then((zip) => {
                if (zip) {
                  let displayName = localityComp?.long_name || address.split(',')[0];
                  if (stateComp) {
                    displayName += `, ${stateComp.short_name}`;
                  }
                  displayName += ` (${zip})`;
                  resolve({ zip, displayName });
                } else {
                  resolve(null);
                }
              });
              return;
            }
          }
          resolve(null);
        }
      );
    });
  };

  const addServiceArea = (zip: string, display: string): boolean => {
    const cleanZip = zip.trim();
    const currentValue = internalValueRef.current;

    // Validate zip format
    if (!cleanZip || !/^\d{5}$/.test(cleanZip)) {
      console.log('Invalid zip format:', cleanZip);
      return false;
    }

    // Check for duplicates
    if (currentValue.includes(cleanZip)) {
      console.log('Duplicate zip, skipping:', cleanZip);
      setError(`${display || cleanZip} is already in your list`);
      setTimeout(() => setError(null), 2000);
      return false;
    }

    const newDisplayMap = { ...displayMapRef.current, [cleanZip]: display };
    setDisplayMap(newDisplayMap);
    displayMapRef.current = newDisplayMap;

    const newValue = [...currentValue, cleanZip];
    internalValueRef.current = newValue;  // Update internal state immediately
    onChangeRef.current?.(newValue);       // Notify parent
    console.log('Added service area:', cleanZip, 'Total:', newValue.length);
    return true;
  };

  const removeServiceArea = (zip: string) => {
    const newValue = internalValueRef.current.filter(z => z !== zip);
    internalValueRef.current = newValue;
    onChangeRef.current?.(newValue);
  };

  const initAutocomplete = () => {
    if (!inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(regions)'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
      });

      autocomplete.addListener('place_changed', async () => {
        const place = autocomplete.getPlace();
        const selectedText = inputRef.current?.value || '';

        setIsResolving(true);
        setError(null);

        try {
          // First, try to extract zip from the place result directly
          if (place.address_components) {
            const zipComp = place.address_components.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) => c.types.includes('postal_code')
            );

            if (zipComp) {
              const localityComp = place.address_components.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.types.includes('locality') || c.types.includes('sublocality') || c.types.includes('neighborhood')
              );
              const stateComp = place.address_components.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.types.includes('administrative_area_level_1')
              );

              let displayName = localityComp?.long_name || place.name || selectedText.split(',')[0];
              if (stateComp) {
                displayName += `, ${stateComp.short_name}`;
              }
              displayName += ` (${zipComp.short_name})`;

              addServiceArea(zipComp.short_name, displayName);
              setInputValue('');
              if (inputRef.current) inputRef.current.value = '';
              setIsResolving(false);
              return;
            }
          }

          // No zip in place result - try reverse geocoding if we have geometry
          if (place.geometry?.location) {
            const lat = typeof place.geometry.location.lat === 'function'
              ? place.geometry.location.lat()
              : place.geometry.location.lat;
            const lng = typeof place.geometry.location.lng === 'function'
              ? place.geometry.location.lng()
              : place.geometry.location.lng;

            const zip = await getZipFromLatLng(lat, lng);
            if (zip) {
              const localityComp = place.address_components?.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.types.includes('locality') || c.types.includes('sublocality') || c.types.includes('neighborhood')
              );
              const stateComp = place.address_components?.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.types.includes('administrative_area_level_1')
              );

              let displayName = localityComp?.long_name || place.name || selectedText.split(',')[0];
              if (stateComp) {
                displayName += `, ${stateComp.short_name}`;
              }
              displayName += ` (${zip})`;

              addServiceArea(zip, displayName);
              setInputValue('');
              if (inputRef.current) inputRef.current.value = '';
              setIsResolving(false);
              return;
            }
          }

          // Last resort - geocode the formatted address or selected text
          const addressToGeocode = place.formatted_address || selectedText;
          if (addressToGeocode) {
            const result = await geocodeAddress(addressToGeocode);
            if (result) {
              addServiceArea(result.zip, result.displayName);
              setInputValue('');
              if (inputRef.current) inputRef.current.value = '';
              setIsResolving(false);
              return;
            }
          }

          // Nothing worked
          setError('Could not find zip code for this location. Try entering the zip code directly.');
          setTimeout(() => setError(null), 4000);
        } catch (err) {
          console.error('Error processing place:', err);
          setError('Error processing location. Please try again.');
          setTimeout(() => setError(null), 3000);
        } finally {
          setIsResolving(false);
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.error('Autocomplete init error:', err);
      setError('Failed to initialize location search');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      const typedValue = inputValue.trim().replace(/,/g, '');

      // Only handle if it's a zip code (let autocomplete handle other inputs)
      if (/^\d{5}$/.test(typedValue)) {
        e.preventDefault();
        addServiceArea(typedValue, typedValue);
        setInputValue('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    }
  };

  const sizeStyles = {
    small: { padding: '4px 11px', fontSize: 14, minHeight: 32 },
    middle: { padding: '8px 11px', fontSize: 14, minHeight: 40 },
    large: { padding: '8px 11px', fontSize: 16, minHeight: 48 },
  };

  const isPhillyArea = (zip: string) => PHILLY_AREA_ZIPS.has(zip);

  const getDisplayName = (zip: string) => displayMap[zip] || zip;

  return (
    <div>
      {/* Selected service areas */}
      {value.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {value.map(zip => {
            const display = getDisplayName(zip);
            return (
              <Tag
                key={zip}
                closable
                onClose={() => removeServiceArea(zip)}
                color={isPhillyArea(zip) ? 'blue' : 'orange'}
                style={{
                  padding: '4px 8px',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <EnvironmentOutlined />
                {display}
              </Tag>
            );
          })}
        </div>
      )}

      {/* Input field */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: `1px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
          borderRadius: 6,
          backgroundColor: disabled || isLoading ? '#f5f5f5' : '#fff',
          transition: 'border-color 0.2s',
          ...sizeStyles[size],
        }}
      >
        <span style={{ paddingRight: 8, color: '#bfbfbf', display: 'flex', alignItems: 'center' }}>
          {isLoading || isResolving ? <Spin size="small" /> : <EnvironmentOutlined />}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isResolving ? 'Finding zip code...' : placeholder}
          disabled={disabled || isLoading || isResolving}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: sizeStyles[size].fontSize,
          }}
        />
      </div>

      {error && (
        <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}

      <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
        Search for any city or neighborhood, or type a 5-digit zip code and press Enter.
      </div>
    </div>
  );
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}
