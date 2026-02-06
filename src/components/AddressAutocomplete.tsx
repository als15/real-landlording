'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

export interface AddressData {
  formatted_address: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  lat: number;
  lng: number;
  place_id: string;
}

interface AddressAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onAddressSelect?: (data: AddressData) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
}

// Track if script is loading/loaded globally
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

    isScriptLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;

    script.onload = () => {
      // Wait for places to be fully available
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

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Start typing an address...',
  size = 'large',
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address', 'address_components', 'geometry', 'place_id'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.formatted_address) return;

        // Extract address components
        const getComponent = (type: string, useShort = false) => {
          const component = place.address_components?.find(
            (c: { types: string[]; short_name: string; long_name: string }) => c.types.includes(type)
          );
          return useShort ? component?.short_name || '' : component?.long_name || '';
        };

        const streetNumber = getComponent('street_number');
        const route = getComponent('route');
        const streetAddress = streetNumber ? `${streetNumber} ${route}` : route;

        const addressData: AddressData = {
          formatted_address: place.formatted_address,
          street_address: streetAddress,
          city: getComponent('locality') || getComponent('sublocality'),
          state: getComponent('administrative_area_level_1', true),
          zip_code: getComponent('postal_code'),
          country: getComponent('country', true),
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
          place_id: place.place_id || '',
        };

        // Update the input value
        if (onChange) {
          onChange(place.formatted_address);
        }

        // Notify parent of full address data
        if (onAddressSelect) {
          onAddressSelect(addressData);
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.error('Autocomplete init error:', err);
      setError('Failed to initialize address autocomplete');
    }
  }, [onChange, onAddressSelect]);

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

  // Initialize autocomplete when input is available
  useEffect(() => {
    if (!isLoading && !error && inputRef.current && !autocompleteRef.current && window.google?.maps?.places) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialization sync
      initAutocomplete();
    }
  }, [isLoading, error, initAutocomplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const sizeStyles = {
    small: { padding: '4px 11px', fontSize: 14 },
    middle: { padding: '8px 11px', fontSize: 14 },
    large: { padding: '8px 11px', fontSize: 16 },
  };

  // Use native input for Google Places compatibility
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: `1px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
          borderRadius: 6,
          backgroundColor: disabled || isLoading ? '#f5f5f5' : '#fff',
          transition: 'border-color 0.2s',
        }}
      >
        <span style={{ paddingLeft: 11, color: '#bfbfbf', display: 'flex', alignItems: 'center' }}>
          {isLoading ? <Spin size="small" /> : <EnvironmentOutlined />}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            ...sizeStyles[size],
          }}
        />
      </div>
      {error && (
        <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}
