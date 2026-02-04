import axios from 'axios';

/**
 * Geolocation Service using OpenStreetMap Nominatim API
 * Free, no API key required, good coverage for Africa
 */

interface GeocodeResult {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
    country?: string;
    formattedAddress: string;
}

interface NominatimResponse {
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
        county?: string;
    };
}

// Rate limiting: Max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

// Simple in-memory cache (consider Redis for production)
const geocodeCache = new Map<string, GeocodeResult>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Wait to respect rate limits
 */
const waitForRateLimit = async (): Promise<void> => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
};

/**
 * Forward Geocoding: Address → Coordinates
 * Converts address string to latitude/longitude
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult> => {
    // Check cache first
    const cacheKey = `forward:${address.toLowerCase()}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
        console.log('Geocode cache hit:', address);
        return cached;
    }

    // Wait for rate limit
    await waitForRateLimit();

    try {
        const response = await axios.get<NominatimResponse[]>(
            'https://nominatim.openstreetmap.org/search',
            {
                params: {
                    q: address,
                    format: 'json',
                    limit: 1,
                    addressdetails: 1,
                },
                headers: {
                    'User-Agent': 'RTM-Dating-App/1.0',
                },
                timeout: 10000,
            }
        );

        if (!response.data || response.data.length === 0) {
            throw new Error('Address not found');
        }

        const result = response.data[0];
        const geocoded: GeocodeResult = {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            city: result.address?.city || result.address?.town || result.address?.village,
            state: result.address?.state || result.address?.county,
            country: result.address?.country,
            formattedAddress: result.display_name,
        };

        // Cache the result
        geocodeCache.set(cacheKey, geocoded);
        setTimeout(() => geocodeCache.delete(cacheKey), CACHE_TTL);

        console.log('Geocoded address:', address, '→', geocoded);
        return geocoded;
    } catch (error: any) {
        console.error('Geocoding error:', error.message);
        throw new Error(`Failed to geocode address: ${error.message}`);
    }
};

/**
 * Reverse Geocoding: Coordinates → Address
 * Converts latitude/longitude to address
 */
export const reverseGeocode = async (
    latitude: number,
    longitude: number
): Promise<GeocodeResult> => {
    // Check cache first
    const cacheKey = `reverse:${latitude},${longitude}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
        console.log('Reverse geocode cache hit:', latitude, longitude);
        return cached;
    }

    // Wait for rate limit
    await waitForRateLimit();

    try {
        const response = await axios.get<NominatimResponse>(
            'https://nominatim.openstreetmap.org/reverse',
            {
                params: {
                    lat: latitude,
                    lon: longitude,
                    format: 'json',
                    addressdetails: 1,
                },
                headers: {
                    'User-Agent': 'RTM-Dating-App/1.0',
                },
                timeout: 10000,
            }
        );

        if (!response.data) {
            throw new Error('Location not found');
        }

        const result = response.data;
        const geocoded: GeocodeResult = {
            latitude,
            longitude,
            city: result.address?.city || result.address?.town || result.address?.village,
            state: result.address?.state || result.address?.county,
            country: result.address?.country,
            formattedAddress: result.display_name,
        };

        // Cache the result
        geocodeCache.set(cacheKey, geocoded);
        setTimeout(() => geocodeCache.delete(cacheKey), CACHE_TTL);

        console.log('Reverse geocoded:', latitude, longitude, '→', geocoded);
        return geocoded;
    } catch (error: any) {
        console.error('Reverse geocoding error:', error.message);
        throw new Error(`Failed to reverse geocode: ${error.message}`);
    }
};

/**
 * Parse location string into components
 * Handles formats like: "Lagos, Lagos State, Nigeria" or "Lagos, Nigeria"
 */
export const parseLocationString = (location: string): {
    city?: string;
    state?: string;
    country?: string;
} => {
    const parts = location.split(',').map(p => p.trim());

    if (parts.length === 3) {
        return {
            city: parts[0],
            state: parts[1],
            country: parts[2],
        };
    } else if (parts.length === 2) {
        return {
            city: parts[0],
            country: parts[1],
        };
    } else if (parts.length === 1) {
        return {
            city: parts[0],
        };
    }

    return {};
};

/**
 * Get coordinates from location string
 * Parses the string and geocodes it
 */
export const getCoordinatesFromLocation = async (
    location: string
): Promise<{ latitude: number; longitude: number }> => {
    const geocoded = await geocodeAddress(location);
    return {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
    };
};

/**
 * Clear geocode cache (useful for testing)
 */
export const clearGeocodeCache = (): void => {
    geocodeCache.clear();
    console.log('Geocode cache cleared');
};
