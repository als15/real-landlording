'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Tag, Spin, Input } from 'antd';
import { EnvironmentOutlined, CloseOutlined } from '@ant-design/icons';

interface ZipCodeAutocompleteProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
}

// Philadelphia area zip codes for validation
const PHILLY_AREA_ZIPS = new Set([
  // Philadelphia
  '19102', '19103', '19104', '19106', '19107', '19108', '19109', '19110',
  '19111', '19112', '19113', '19114', '19115', '19116', '19118', '19119',
  '19120', '19121', '19122', '19123', '19124', '19125', '19126', '19127',
  '19128', '19129', '19130', '19131', '19132', '19133', '19134', '19135',
  '19136', '19137', '19138', '19139', '19140', '19141', '19142', '19143',
  '19144', '19145', '19146', '19147', '19148', '19149', '19150', '19151',
  '19152', '19153', '19154', '19155',
  // Surrounding areas
  '19001', '19002', '19003', '19004', '19006', '19007', '19008', '19009',
  '19010', '19012', '19013', '19014', '19015', '19018', '19019', '19020',
  '19021', '19022', '19023', '19025', '19026', '19027', '19028', '19029',
  '19030', '19031', '19032', '19033', '19034', '19035', '19036', '19038',
  '19040', '19041', '19043', '19044', '19046', '19047', '19048', '19050',
  '19053', '19054', '19055', '19056', '19057', '19060', '19061', '19063',
  '19064', '19066', '19067', '19070', '19072', '19073', '19074', '19075',
  '19076', '19078', '19079', '19080', '19081', '19082', '19083', '19085',
  '19086', '19087', '19088', '19089', '19090', '19092', '19093', '19094',
  '19095', '19096', '08002', '08003', '08004', '08007', '08009', '08010',
  '08012', '08014', '08016', '08018', '08019', '08020', '08021', '08026',
  '08027', '08028', '08029', '08030', '08031', '08032', '08033', '08034',
  '08035', '08036', '08037', '08039', '08041', '08043', '08045', '08046',
  '08048', '08049', '08050', '08051', '08052', '08053', '08054', '08055',
  '08056', '08057', '08059', '08060', '08061', '08062', '08063', '08065',
  '08066', '08067', '08068', '08069', '08070', '08071', '08072', '08073',
  '08074', '08075', '08076', '08077', '08078', '08079', '08080', '08081',
  '08083', '08084', '08085', '08086', '08088', '08089', '08090', '08091',
  '08093', '08094', '08095', '08096', '08097', '08099', '08101', '08102',
  '08103', '08104', '08105', '08106', '08107', '08108', '08109', '08110',
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

    // Check if script already exists (loaded by AddressAutocomplete)
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

export default function ZipCodeAutocomplete({
  value = [],
  onChange,
  placeholder = 'Type a city, neighborhood, or zip code...',
  size = 'large',
  disabled = false,
}: ZipCodeAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const addZipCode = useCallback((zip: string) => {
    const cleanZip = zip.trim();
    if (!cleanZip || value.includes(cleanZip)) return;

    // Validate it's a 5-digit zip
    if (!/^\d{5}$/.test(cleanZip)) return;

    const newValue = [...value, cleanZip];
    onChange?.(newValue);
  }, [value, onChange]);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(regions)'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.address_components) return;

        // Extract zip code from the place
        const zipComponent = place.address_components.find(
          (c: { types: string[] }) => c.types.includes('postal_code')
        );

        if (zipComponent) {
          const zip = zipComponent.short_name;
          addZipCode(zip);
        } else {
          // If no zip code in result, check if they typed a valid zip
          const typedValue = inputRef.current?.value || '';
          if (/^\d{5}$/.test(typedValue)) {
            addZipCode(typedValue);
          }
        }

        setInputValue('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.error('Autocomplete init error:', err);
      setError('Failed to initialize autocomplete');
    }
  }, [addZipCode]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial setup, not cascading
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (inputRef.current && !autocompleteRef.current) {
          initAutocomplete();
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
        setError(err.message);
        setIsLoading(false);
      });
  }, [initAutocomplete]);

  useEffect(() => {
    if (!isLoading && !error && inputRef.current && !autocompleteRef.current && window.google?.maps?.places) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialization sync
      initAutocomplete();
    }
  }, [isLoading, error, initAutocomplete]);

  const removeZipCode = (zip: string) => {
    const newValue = value.filter(z => z !== zip);
    onChange?.(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const typedValue = inputValue.trim().replace(/,/g, '');

      if (/^\d{5}$/.test(typedValue)) {
        addZipCode(typedValue);
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

  return (
    <div>
      {/* Selected zip codes */}
      {value.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {value.map(zip => (
            <Tag
              key={zip}
              closable
              onClose={() => removeZipCode(zip)}
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
              {zip}
              {!isPhillyArea(zip) && <span style={{ fontSize: 11 }}>(outside area)</span>}
            </Tag>
          ))}
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
          {isLoading ? <Spin size="small" /> : <EnvironmentOutlined />}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
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
        Search for a neighborhood or city, or type zip codes directly. Press Enter to add.
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
